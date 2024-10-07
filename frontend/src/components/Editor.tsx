import React, { useRef, useEffect, useContext, useState } from "react";

import { EditorState } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { EditorView, basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { Button } from "@mui/material";
import { socketContext } from "../socket";

import * as Y from "yjs";
import { yCollab } from "y-codemirror.next";
import { WebrtcProvider } from "y-webrtc";

const Editor: React.FC = () => {
  const editor = useRef<null | HTMLDivElement>(null);
  const [code, setCode] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const socket = useContext(socketContext);
  const viewRef = useRef<EditorView | null>(null);
  const shouldEmit = useRef(true);

  const onUpdate = EditorView.updateListener.of((v) => {
    console.log("[onUpdate] got update: ", v);
    if (
      (code !== v.state.doc.toString() ||
        v.state.selection.main.head !== cursorPosition) &&
      shouldEmit.current
    ) {
      setCode(v.state.doc.toString());
      setCursorPosition(v.state.selection.main.head);
      // socket.emit(
      //   "editor-val",
      //   JSON.stringify({
      //     val: viewRef.current?.state.doc.toString(),
      //     token: localStorage.getItem("token"),
      //     cursor: viewRef.current?.state.selection.main.head,
      //   }),
      // );
    }
    // shouldEmit.current = true;
  });

  // useEffect(() => {
  //   if (viewRef.current && socket) {
  //     // socket.emit(
  //     //   "editor-val",
  //     //   JSON.stringify({
  //     //     val: viewRef.current.state.doc.toString(),
  //     //     token: localStorage.getItem("token"),
  //     //     cursor: viewRef.current.state.selection.main.head,
  //     //   }),
  //     // );
  //   }
  // }, [code, cursorPosition, socket]);

  useEffect(() => {
    if (!editor.current) return;

    const ydoc = new Y.Doc();
    const provider = new WebrtcProvider("atharv", ydoc, {
      signaling: ["ws://localhost:4444"],
    });
    const ytext = ydoc.getText("codemirror");
    const undoManager = new Y.UndoManager(ytext);

    const color = "#ff0000";

    provider.awareness.setLocalStateField("user", {
      name: "Anonymous " + Math.floor(Math.random() * 1000),
      color,
      colorLight: "#ffffff",
    });

    const startState = EditorState.create({
      doc: "",
      extensions: [
        basicSetup,
        keymap.of([defaultKeymap, indentWithTab]),
        javascript(),
        yCollab(ytext, provider.awareness, { undoManager }),
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
    if (socket) {
      socket.on("editor-val", (valObject: string) => {
        console.log("[editor-val] got valObject: ", valObject);
        const { val, cursor } = JSON.parse(valObject);
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
    <div>
      <div ref={editor}></div>
      <Button onClick={() => console.log(code)}>Click me</Button>
    </div>
  );
};

export default Editor;
