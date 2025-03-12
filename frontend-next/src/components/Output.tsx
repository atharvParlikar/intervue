type OutputProps = {
  text: string;
  type: "success" | "error";
  roomId: string;
}

export function Output({ text, type, roomId }: OutputProps) {
  return (
    <div className="h-full w-full p-4">
      <pre
        className={"text-wrap'" + type === "success" ? "" : "text-red-600"}
      >
        {`Room:${roomId}`}${"  "}{text}
      </pre>
    </div>
  );
}
