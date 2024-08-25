import { useContext, useState } from "react";
import { socketContext } from "../socket";

interface Output {
  output: string;
}

export default function Output() {
  const socket = useContext(socketContext);
  const [output, setOutput] = useState<Output>({ output: "" });

  socket.on("output", (output: string) => {
    const output_ = JSON.parse(output);
    setOutput(output_);
  });

  const lines = output.output.split("\n");

  return (
    <div className="h-full w-full rounded-lg bg-slate-900 font-mono text-gray-200 p-3 flex drop-shadow-lg">
      <div className="mr-3 h-fit">{"out$"}</div>
      <div className="flex-col h-fit">
        {output.output !== "" &&
          lines.map((line, index) => <p key={index}>{line}</p>)}
      </div>
    </div>
  );
}
