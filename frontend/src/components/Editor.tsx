import React, { useRef, useEffect, useContext, useState } from "react";

import { ChangeSpec, EditorState } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { EditorView, basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { Button } from "@mui/material";
import { socketContext } from "../socket";

const Editor: React.FC = () => {
  const editor = useRef<null | HTMLDivElement>(null);
  const [code, setCode] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const socket = useContext(socketContext);
  const viewRef = useRef<EditorView | null>(null);

  const onUpdate = EditorView.updateListener.of((v) => {
    if (
      code !== v.state.doc.toString() ||
      v.state.selection.main.head !== cursorPosition
    ) {
      setCode(v.state.doc.toString());
      setCursorPosition(v.state.selection.main.head);
    }
  });

  useEffect(() => {
    if (viewRef.current && socket) {
      socket.emit(
        "editor-val",
        JSON.stringify({
          val: viewRef.current.state.doc.toString(),
          token: localStorage.getItem("token"),
          cursor: viewRef.current.state.selection.main.head,
        }),
      );
    }
  }, [code, cursorPosition, socket]);

  useEffect(() => {
    const startState = EditorState.create({
      doc: "",
      extensions: [
        basicSetup,
        keymap.of([defaultKeymap, indentWithTab]),
        javascript(),
        onUpdate,
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
