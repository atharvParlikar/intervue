import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { useCallback, useState, useRef, useEffect, useContext } from "react";
import { socketContext } from "../socket";
import { githubLight } from "@ddietr/codemirror-themes/github-light";
import { Button } from "./ui/button";
import { useUser, useAuth } from "@clerk/clerk-react";

function Editor() {
  const [value, setValue] = useState<string>("");
  const parentRef = useRef<HTMLDivElement>(null);
  const [parentHeight, setParentHeight] = useState(0);
  const socket = useContext(socketContext);
  const { user } = useUser();
  const { getToken } = useAuth();

  useEffect(() => {
    if (parentRef.current) {
      const height = parentRef.current.clientHeight;
      setParentHeight(height);
    }
  }, []);

  socket.on("editor-val", (val: string) => {
    setValue(val);
  });

  const changeValue = useCallback(async (val: string) => {
    setValue(val);
    console.log(val);
    socket.emit(
      "editor-val",
      JSON.stringify({
        val,
        email: user?.primaryEmailAddress?.emailAddress,
        token: await getToken(),
      }),
    );
  }, []);

  return (
    <div
      className="h-full rounded-lg bg-[#fafafa] p-1 border-4 border-gray-300 drop-shadow-xl"
      ref={parentRef}
    >
      <div className="flex w-full justify-end">
        <Button
          onClick={() => {
            socket.emit(
              "run-code",
              JSON.stringify({
                email: user?.primaryEmailAddress?.emailAddress,
                code: value,
              }),
            );
          }}
          variant={"secondary"}
        >
          Run
        </Button>
      </div>
      <CodeMirror
        value={value}
        extensions={[python()]}
        onChange={changeValue}
        theme={githubLight}
        height={`${parentHeight - 50}px`}
      />
    </div>
  );
}

export default Editor;
