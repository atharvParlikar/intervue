import "../App.css";
import WebRTCVideoCall from "./WebRTCVideoCall";
import Editor from "./Editor";
import Output from "./Output";
import { useParams } from "react-router-dom";
import { SignedIn } from "@clerk/clerk-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Button } from "./ui/button";
import { useAuth } from "@clerk/clerk-react";
import { useContext, useEffect, useState } from "react";
import { socketContext } from "../socket";

function Room() {
  const { roomId } = useParams();
  const { getToken } = useAuth();
  const socket = useContext(socketContext);
  const [joinSuccess, setJoinSuccess] = useState(false);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
      createRoom();
    }
  });

  socket.on("connect", () => {
    socket.on("createFail", async () => {
      console.log("creating room failed");
      socket.emit(
        "joinRoom",
        JSON.stringify({
          roomId,
          jwtString: await getToken(),
          socketId: socket.id,
        }),
      );
    });

    socket.on("createSuccess", () => {
      setJoinSuccess(true);
    });

    socket.on("joinSuccess", () => {
      console.log("joined successfully");
      setJoinSuccess(true);
    });

    socket.on("notify", (userObject: string) => {
      const user = JSON.parse(userObject);
      notify(user);
    });
  });

  const createRoom = async () => {
    console.log(roomId);
    socket.emit(
      "createRoom",
      JSON.stringify({
        roomId,
        jwtString: await getToken(),
      }),
    );
    console.log("Sent createRoom message");
  };

  const notify = (user: { email: string; socketId: string }) =>
    toast(
      <div>
        <p className="mb-2">{user.email} is trying to join the meeting.</p>
        <Button
          onClick={() => {
            toast.dismiss();
            socket.emit(
              "acceptJoin",
              JSON.stringify({
                roomId,
                socketId: user.socketId,
                email: user.email,
              }),
            );
          }}
        >
          Allow
        </Button>
      </div>,
    );

  return (
    <SignedIn>
      {joinSuccess ? (
        <div className="grid h-screen grid-cols-5 grid-rows-5 gap-4 p-3">
          <div className="col-span-3 row-span-5 rounded-md">
            <Editor />
          </div>
          <div className="col-span-2 col-start-4 row-span-3 rounded-md bg-blue-300">
            <Output />
          </div>
          <div className="col-span-2 col-start-4 row-span-2 row-start-4 rounded-md bg-green-300">
            <WebRTCVideoCall />
            <Button onClick={() => socket.emit("debug")}>Debug</Button>
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
