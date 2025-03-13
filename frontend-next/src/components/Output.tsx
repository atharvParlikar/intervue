import { useStore } from "@/contexts/store";

type OutputProps = {
  roomId: string;
}

export function Output({ roomId }: OutputProps) {
  const { outputBuffer } = useStore();
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
