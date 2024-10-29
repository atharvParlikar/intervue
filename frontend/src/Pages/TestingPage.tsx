import Editor from "../components/Editor";
import Testcases, { TestResult } from "../components/TestResults";
import { Button } from "../components/ui/button";
import { trpc } from "../client";
import { useStore } from "../contexts/zustandStore";
import { useContext, useEffect, useState } from "react";
import { socketContext } from "../socket";
import { useParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import { SignedIn } from "@clerk/clerk-react";
import "react-toastify/dist/ReactToastify.css";
import Topbar from "../components/Topbar";

const TestingPage = () => {
  const { code } = useStore();
  const problemFunction = "add(self, num1, num2)";
  const [resultState, setResultState] = useState<TestResult | null>(null);
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
        console.log("result: ", result);
        setResultState(JSON.parse(result));
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
      socket.off("notify");
    };
  }, [socket]);

  const pythonTemplate = `class Solution:
  def ${problemFunction}:
    pass\n`;

  const endMeeting = (token: string) => {
    socket.emit("kill", token);
  };

  return (
    <SignedIn>
      <div className="h-screen w-screen flex flex-col items-center justify-center gap-4">
        <Topbar
          runCode={handleRun}
          endMeeting={() => endMeeting(localStorage.getItem("token")!)}
        />
        <div className="h-1/2 w-4/5 ">
          <Editor initialDocValue={pythonTemplate} roomId={roomId!} />
        </div>
        <div className="h-1/2 w-4/5">
          {resultState && <Testcases testResults={resultState} />}
        </div>
        <ToastContainer />
      </div>
    </SignedIn>
  );
};

export default TestingPage;
