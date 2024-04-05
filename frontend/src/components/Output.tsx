import { useContext, useState } from "react";
import { socketContext } from "../socket";

export default function Output() {
  const socket = useContext(socketContext);
  const [output, setOutput] = useState<string>("");

  socket.on("output", (output: string) => {
    const output_ = JSON.parse(output);
    setOutput(output_);
  });

  return <div className=" h-full w-full rounded-es-lg">{output.output}</div>;
}
