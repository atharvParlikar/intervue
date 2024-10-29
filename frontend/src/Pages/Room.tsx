import "../App.css";
import WebRTCWrapper from "../components/WebRTCWrapper";
import Output from "../components/Output";

import { useParams } from "react-router-dom";
import { SignedIn } from "@clerk/clerk-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Button } from "../components/ui/button";
import { useContext, useEffect, useState, useRef } from "react";
import { socketContext } from "../socket";
import { trpc } from "../client";
import Editor from "../components/Editor";

// Import resizable panel components
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import Topbar from "../components/Topbar";

type RoomProps = {
  setIsRoomLive: React.Dispatch<React.SetStateAction<boolean>>;
};

function Room({ setIsRoomLive }: RoomProps) {
  const { roomId } = useParams();
  const socket = useContext(socketContext);
  const [renderVideo, setRenderVideo] = useState(false);
  const userType = useRef<string | null>(null);
  const setSocketMutation = trpc.setSocket.useMutation({
    onSuccess: (data) => {
      console.log("set socket success", data);
      userType.current = data.userType;
      setRenderVideo(true);
    },
  });

  const runCodeMutation = trpc.runCode.useMutation({
    onSuccess: (data) => {
      console.log("run code success", data);
    },
  });

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
      console.log("socket connected");
    }
  }, [socket]);

  const setSocket = async () => {
    setSocketMutation.mutate({
      socketId: socket.id!,
      roomId_: roomId!,
    });
  };

  useEffect(() => {
    socket.on("connect", () => {
      console.log("connected");
      setSocket();

      socket.on("notify", (userObject: string, callback) => {
        console.log("notify called");
        const user = JSON.parse(userObject);
        notify(user, callback);
      });

      socket.on("kill", () => {
        setIsRoomLive(false);
      });
    });

    return () => {
      socket.off("connect");
      socket.off("notify");
      socket.off("kill");
    };
  }, []);

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

  const endMeeting = (token: string) => {
    socket.emit("kill", token);
  };

  return (
    <SignedIn>
      <Topbar
        runCode={(code: string) => runCodeMutation.mutate({ code })}
        endMeeting={endMeeting}
      />
      <div className="flex h-screen w-screen">
        <PanelGroup direction="horizontal">
          <Panel defaultSize={50} minSize={25}>
            {roomId && <Editor roomId={roomId} />}
          </Panel>
          <PanelResizeHandle />
          <Panel>
            <PanelGroup direction="vertical">
              <Panel defaultSize={50} minSize={25} className="bg-blue-300">
                <Output />
              </Panel>
              <PanelResizeHandle />
              <Panel defaultSize={50} minSize={25} className="bg-green-300">
                {renderVideo && userType.current && (
                  <WebRTCWrapper userType={userType.current} />
                )}
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>

      <ToastContainer />
    </SignedIn>
  );
}

export default Room;
