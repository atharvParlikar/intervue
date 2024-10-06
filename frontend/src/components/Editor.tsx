import React, { useRef, useEffect } from "react";

import { EditorState, basicSetup } from "@codemirror/basic-setup";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";

console.log(basicSetup);

const Editor = () => {
  const editor = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    const startState = EditorState.create({
      doc: "Hello World",
      extensions: [keymap.of([defaultKeymap, indentWithTab])],
    });

    const view = new EditorView({ state: startState, parent: editor.current });

    return () => {
      view.destroy();
    };
  }, []);

  return <div ref={editor}></div>;
};

export default Editor;
