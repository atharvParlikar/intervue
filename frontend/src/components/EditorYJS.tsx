import React, { useEffect, useRef } from "react";
import * as Y from "yjs";
import { yCollab } from "y-codemirror.next";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { io, Socket } from "socket.io-client";
import {
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
  indentOnInput,
} from "@codemirror/language";

const basicSetup = [
  lineNumbers(),
  highlightActiveLineGutter(),
  highlightSpecialChars(),
  history(),
  drawSelection(),
  syntaxHighlighting(defaultHighlightStyle),
  bracketMatching(),
  indentOnInput(),
  keymap.of([...defaultKeymap, ...historyKeymap]),
];

interface CollaborativeEditorProps {
  roomName: string;
  initialContent?: string;
}

const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  roomName,
  initialContent = "",
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let view: EditorView | undefined;

    const initEditor = async () => {
      if (!editorRef.current) return;

      try {
        // Clean up previous instances
        if (viewRef.current) {
          viewRef.current.destroy();
        }
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
        if (ydocRef.current) {
          ydocRef.current.destroy();
        }

        // Initialize Socket.IO connection
        const socket = io("http://localhost:3000", {
          transports: ["websocket"],
          autoConnect: true,
        });

        socketRef.current = socket;

        // Initialize Yjs document
        const ydoc = new Y.Doc();
        ydocRef.current = ydoc;

        socket.on("connect", () => {
          console.log("Connected to server");
          socket.emit("join-editor-room", roomName);
        });

        // Handle Yjs updates
        const ytext = ydoc.getText("codemirror");
        const undoManager = new Y.UndoManager(ytext);

        // Set initial content if provided and document is empty
        if (initialContent && ytext.toString() === "") {
          ytext.insert(0, initialContent);
        }

        // Create editor state
        const state = EditorState.create({
          doc: ytext.toString(),
          extensions: [
            basicSetup,
            javascript(),
            yCollab(
              ytext,
              {
                clientID: socket.id,
                user: {
                  name: "User " + Math.floor(Math.random() * 100),
                  color:
                    "#" + Math.floor(Math.random() * 16777215).toString(16),
                },
              },
              { undoManager },
            ),
          ],
        });

        // Create editor view
        view = new EditorView({
          state,
          parent: editorRef.current,
        });

        viewRef.current = view;

        // Handle document updates
        socket.on("sync", (update: Uint8Array) => {
          Y.applyUpdate(ydoc, update);
        });

        // Send updates to server
        ydoc.on("update", (update: Uint8Array) => {
          socket.emit("sync", update);
        });
      } catch (error) {
        console.error("Editor initialization error:", error);
      }
    };

    initEditor();

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (ydocRef.current) {
        ydocRef.current.destroy();
        ydocRef.current = null;
      }
    };
  }, [roomName, initialContent]);

  return (
    <div
      ref={editorRef}
      className="w-full border border-gray-300 rounded-md"
      style={{ minHeight: "400px" }}
    />
  );
};

export default CollaborativeEditor;
