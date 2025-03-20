import { useStore } from "@/contexts/store";
import { getSocket } from "@/lib/socketChannel";
import { useEffect } from "react";

type OutputProps = {
  roomId: string;
}

export function Output({ roomId }: OutputProps) {
  const { outputBuffer, addOutput } = useStore();
  const socket = getSocket();

  useEffect(() => {
    if (!socket) return;
    if (!socket.connected) return;

    socket.on("output", ({ stdout, stderr }) => {
      if (stdout) {
        addOutput(stdout);
      }
      if (stderr) {
        addOutput(stderr);
      }
    });
  }, [socket]);

  return (
    <div className="h-full w-full p-4">
      {
        outputBuffer.map((output, index) => {
          return <pre
            className="text-wrap"
            key={index}
          >
            {`room:${roomId}$ ${output}`}
          </pre>
        })
      }
    </div>
  );
}
