import "../App.css";
import VideoCall from "./VideoCall";
import Editor from "./Editor";
import Output from "./Output";
import { useParams } from "react-router-dom";
import { SignedIn } from "@clerk/clerk-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Button } from "./ui/button";
import { useAuth } from "@clerk/clerk-react";
import { useContext, useEffect, useState, useRef } from "react";
import { socketContext } from "../socket";
import axios from "axios";

function Room() {
  const { roomId } = useParams();
  const { getToken } = useAuth();
  const socket = useContext(socketContext);
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [renderVideo, setRenderVideo] = useState(false);
  const userType = useRef<string | null>(null)

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }
  }, [socket]);


  const setSocket = async () => {
    const res = await axios.post("http://localhost:3000/set-socket", {
      socketId: socket.id,
      token: await getToken({ template: "user" }),
      roomId_: roomId
    });

    if (res.status === 200) {
      toast("SocketID set in db successfully.", { type: "success" });
      setJoinSuccess(true);
      userType.current = res.data.userType;
      setRenderVideo(true);
    } else {
      toast("Unable to set socketID  in db.", { type: "success" });
    }
  }

  useEffect(() => {
    socket.on("connect", () => {
      setSocket();

      socket.on("createSuccess", () => {
        setJoinSuccess(true);
      });

      socket.on("joinSuccess", () => {
        console.log("joined successfully");
        setJoinSuccess(true);
      });

      socket.on("notify", (userObject: string) => {
        console.log("notify called");
        const user = JSON.parse(userObject);
        notify(user);
      });

    });

    return () => {
      socket.off("connect");
      socket.off("createSuccess");
      socket.off("joinSuccess");
      socket.off("notify");
    }
  })


  const notify = (user: {
    email: string;
    socketId: string;
    firstName: string;
  }) =>
    toast(
      <div>
        <p className="mb-2">{user.email} is trying to join the meeting.</p>
        <Button
          onClick={() => {
            toast.dismiss();
            socket.emit(
              "acceptJoin",
              JSON.stringify({
                ...user,
                roomId,
              }),
            );
          }}
        >
          Allow
        </Button>
      </div>
    );

  return (
    <SignedIn>
      {joinSuccess || renderVideo ? (
        <div className="grid h-screen grid-cols-5 grid-rows-5 gap-4 p-3">
          <div className="col-span-3 row-span-5 rounded-md">
            <div>{socket.id}</div>
            <Editor />
          </div>
          <div className="col-span-2 col-start-4 row-span-3 rounded-md bg-blue-300">
            <Output />
          </div>
          <div className="col-span-2 col-start-4 row-span-2 row-start-4 rounded-md bg-green-300">
            {(renderVideo && userType.current) &&
              <VideoCall userType={userType.current} />
            }
          </div>
        </div>
      ) : (
        <div>Waiting to join...</div>
      )}
      <ToastContainer />
    </SignedIn>
  );
}

export default Room;
