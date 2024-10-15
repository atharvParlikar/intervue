import React, { useRef, useEffect, useContext } from "react";

import { EditorState } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { EditorView, basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { socketContext } from "../socket";
import { tokyoNight } from "@uiw/codemirror-theme-tokyo-night";

import * as Y from "yjs";
import { yCollab } from "y-codemirror.next";
import { WebrtcProvider } from "y-webrtc";
import { useStore } from "../contexts/zustandStore";
import { trpc } from "../client";

type EditorProps = {
  roomId: string;
  defaultValue?: string;
};

const Editor: React.FC<EditorProps> = ({ roomId, defaultValue }) => {
  const editor = useRef<null | HTMLDivElement>(null);
  const socket = useContext(socketContext);
  const viewRef = useRef<EditorView | null>(null);
  const shouldEmit = useRef(true);
  const providerRef = useRef<WebrtcProvider | null>(null);
  const yTextRef = useRef<Y.Text | null>(null);
  const hostQuery = trpc.verifyHost.useQuery({ roomId });
  const { code, updateCode } = useStore();

  const onUpdate = EditorView.updateListener.of((v) => {
    if (code !== v.state.doc.toString()) {
      updateCode(v.state.doc.toString());
    }
  });

  useEffect(() => {
    if (!editor.current) return;

    const ydoc = new Y.Doc();
    const provider = new WebrtcProvider(roomId, ydoc, {
      signaling: ["ws://localhost:4444"],
    });
    providerRef.current = provider;
    const yText = ydoc.getText("codemirror");
    yTextRef.current = yText;
    const undoManager = new Y.UndoManager(yText);

    const color = "#ff0000";

    provider.awareness.setLocalStateField("user", {
      name: "atharv",
      color,
      colorLight: "#ffffff",
    });

    const startState = EditorState.create({
      doc: defaultValue,
      extensions: [
        basicSetup,
        keymap.of([defaultKeymap, indentWithTab]),
        python(),
        onUpdate,
        tokyoNight,
        yCollab(yText, provider.awareness, { undoManager }),
      ],
    });

    if (editor.current) {
      const view = new EditorView({
        state: startState,
        parent: editor.current,
      });

      viewRef.current = view;
    }

    return () => {
      viewRef.current?.destroy();
      provider.destroy();
      ydoc.destroy();
    };
  }, []);

  useEffect(() => {
    const populateDocument = async () => {
      if (!providerRef.current || !yTextRef.current) return;
      if (
        providerRef.current.connected &&
        defaultValue &&
        !hostQuery.isLoading &&
        hostQuery.data
      ) {
        if (hostQuery.data.isHost) {
          yTextRef.current.insert(0, defaultValue);
        }
      }
    };

    populateDocument();
  }, [providerRef.current, hostQuery.isLoading, hostQuery.data]);

  useEffect(() => {
    if (socket) {
      socket.on("editor-val", (valObject: string) => {
        console.log("[editor-val] got valObject: ", valObject);
        const { val } = JSON.parse(valObject);
        viewRef.current?.dispatch({
          changes: {
            from: 0,
            to: viewRef.current.state.doc.length,
            insert: val,
          },
        });
        shouldEmit.current = false;
      });
    }

    return () => {
      socket.off("editor-val");
    };
  }, [socket]);

  return (
    <div className={`h-full bg-tokyonightBase`}>
      <div ref={editor}></div>
      {/* <Button onClick={() => console.log(code)}>Click me</Button> */}
    </div>
  );
};

export default Editor;
