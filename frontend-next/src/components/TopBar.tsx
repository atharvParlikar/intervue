import { UserButton } from "@clerk/nextjs";
import { Button } from "./ui/button";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import { useStore } from "@/contexts/store";
import { trpc } from "@/lib/trpc";

export function TopBar() {
  const { roomId } = useParams<{ roomId: string }>();
  const { editorState, addOutput } = useStore();
  const runCodeMutation = trpc.runCode.useMutation();

  const handleRoomIdClick = () => {
    navigator.clipboard.writeText(roomId);
    toast(`room-id ${roomId} copied to your clipboard!`);
  }

  const handleRun = () => {
    runCodeMutation.mutateAsync({ code: editorState }, {
      onSuccess: ({ stdout, stderr }) => {
        if (stdout) {
          addOutput(stdout);
        } else {
          //  TODO: maybe stderr should be rendered red in the output window.
          addOutput(stderr);
        }
      }
    })
  }

  return (
    <div className="w-full flex justify-between items-center p-2">
      <div className="">
        <UserButton />
      </div>
      <Button onClick={handleRun} className="bg-green-500">
        Run
        {"  |>"}
      </Button>
      <span onClick={handleRoomIdClick}>room-id: {roomId}</span>
    </div>
  );
}
