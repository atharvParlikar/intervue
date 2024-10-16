import Editor from "../components/Editor";
import Testcases from "../components/Testcases";
import { Button } from "../components/ui/button";
import { trpc } from "../client";
import { useStore } from "../contexts/zustandStore";
import { useContext, useEffect, useState } from "react";
import { socketContext } from "../socket";
import { useParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import { SignedIn } from "@clerk/clerk-react";
import "react-toastify/dist/ReactToastify.css";

const TestingPage = () => {
  const { code } = useStore();
  const problemFunction = "sum(self, arr)";
  const [resultState, setResultState] = useState<string>("");
  const setSocketMutation = trpc.setSocket.useMutation();
  const socket = useContext(socketContext);
  const { roomId } = useParams();

  const { refetch } = trpc.judge.useQuery(
    {
      code,
      language: "python",
      problemFunction,
    },
    {
      enabled: false,
    },
  );

  const notify = (
    user: {
      email: string;
      firstName: string;
    },
    callback: (arg0: boolean) => void,
  ) =>
    toast(
      <div>
        <p className="mb-2">{user.email} is trying to join the meeting.</p>
        <Button
          onClick={() => {
            toast.dismiss();
            callback(true);
          }}
        >
          Allow
        </Button>
      </div>,
    );

  const handleRun = async () => {
    refetch();
  };

  const setSocket = async () => {
    setSocketMutation.mutate({
      socketId: socket.id!,
      roomId_: roomId!,
    });
  };

  useEffect(() => {
    if (socket.connected) {
      console.log("Connected to socket");
      socket.on("judge", (result: string) => {
        console.log("judge: ", result);
      });

      socket.on("notify", (userObject: string, callback) => {
        console.log("notify called");
        const user = JSON.parse(userObject);
        notify(user, callback);
      });
      setSocket().then(() => console.log("socket set successfully"));
    }
    return () => {
      socket.off("judge");
    };
  }, [socket]);

  const pythonTemplate = `class Solution:
  def ${problemFunction}:
    pass\n`;

  return (
    <SignedIn>
      <div className="h-screen w-screen flex flex-col items-center justify-center gap-4">
        <Button onClick={handleRun}>Run</Button>
        <div className="h-1/3 w-1/3 ">
          <Editor initialDocValue={pythonTemplate} roomId={roomId!} />
        </div>
        <div className="h-1/3 w-1/3">
          <Testcases />
        </div>
        <ToastContainer />
      </div>
    </SignedIn>
  );
};

export default TestingPage;
