/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import React, { useRef, useEffect } from "react";

import { EditorState } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { EditorView, basicSetup } from "codemirror";
import { python } from "@codemirror/lang-python";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { dracula } from "thememirror"

import * as Y from "yjs";
import { yCollab } from "y-codemirror.next";
import { WebrtcProvider } from "y-webrtc";
import { useStore } from "@/contexts/store";
import { trpc } from "@/lib/trpc";
import { getSocket } from "@/lib/socketChannel";

type EditorProps = {
  roomId: string;
  initialDocValue?: string;
};

const Editor: React.FC<EditorProps> = ({ roomId, initialDocValue }) => {
  const editor = useRef<null | HTMLDivElement>(null);
  const socket = getSocket();
  const viewRef = useRef<EditorView | null>(null);
  const shouldEmit = useRef(true);
  const providerRef = useRef<WebrtcProvider | null>(null);
  const yTextRef = useRef<Y.Text | null>(null);
  const syncedRef = useRef<boolean>(false);
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

    provider.on("synced", (synced) => {
      console.log("synced: ", synced);
      syncedRef.current = synced.synced;
    });

    const color = "#ff0000";

    provider.awareness.setLocalStateField("user", {
      name: "atharv",
      color,
      colorLight: "#ffffff",
    });

    const startState = EditorState.create({
      doc: "",
      extensions: [
        dracula,
        basicSetup,
        keymap.of([defaultKeymap, indentWithTab]),
        python(),
        onUpdate,
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
        initialDocValue &&
        !hostQuery.isLoading &&
        hostQuery.data
      ) {
        console.log(hostQuery.data.isHost);
        if (hostQuery.data.isHost && !syncedRef.current) {
          yTextRef.current.insert(0, initialDocValue);
        }
        if (hostQuery.data.isHost && syncedRef.current) {
          yTextRef.current.delete(0, yTextRef.current.length);
          yTextRef.current.insert(0, initialDocValue);
        }
      }
    };
    populateDocument();
  }, [
    providerRef.current,
    hostQuery.isLoading,
    hostQuery.data,
    syncedRef.current,
  ]);

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
      socket?.off("editor-val");
    };
  }, [socket]);

  return (
    <div className={`h-full bg-tokyonightBase`}>
      <div className="h-full" ref={editor}></div>
    </div>
  );
};

export default Editor;
