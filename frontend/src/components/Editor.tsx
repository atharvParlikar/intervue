import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { tokyoNight } from "@uiw/codemirror-theme-tokyo-night";
import { useCallback, useState, useRef, useEffect, useContext } from "react";
import { socketContext } from "../socket";

// TODO:
// connect the two clients with websocket connection for collaborative editor

function Editor() {
  const [value, setValue] = useState<string>("");
  const parentRef = useRef<HTMLDivElement>(null);
  const [parentHeight, setParentHeight] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const socket = useContext(socketContext);

  useEffect(() => {
    if (parentRef.current) {
      const height = parentRef.current.clientHeight;
      setParentHeight(height);
    }
  }, []);

  socket.on("connect", () => {
    console.log("Connected from Editor");
    setIsConnected(true);
    socket.on("editor-val", (val: string) => {
      setValue(val);
    });
  });

  const changeValue = useCallback((val: string) => {
    setValue(val);
    if (isConnected) {
      socket.emit("editor-value", val);
    }
  }, []);

  return (
    <div className="h-full rounded-lg bg-[#1a1b26] p-1" ref={parentRef}>
      <CodeMirror
        value={value}
        extensions={[javascript({ jsx: true })]}
        onChange={() => changeValue}
        theme={tokyoNight}
        height={`${parentHeight}px`}
      />
    </div>
  );
}

export default Editor;
