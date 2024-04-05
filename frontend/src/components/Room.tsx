import "../App.css";
import WebRTCVideoCall from "./WebRTCVideoCall";
import Editor from "./Editor";
import Output from "./Output";
import { useParams } from "react-router-dom";
import { SignedIn } from "@clerk/clerk-react";

function Room() {
  const { roomID } = useParams();

  return (
    <SignedIn>
      <div className="grid h-screen grid-cols-5 grid-rows-5 gap-4 p-3">
        <div className="col-span-3 row-span-5 rounded-md">
          <Editor />
        </div>
        <div className="col-span-2 col-start-4 row-span-3 rounded-md bg-blue-300">
          <Output />
        </div>
        <div className="col-span-2 col-start-4 row-span-2 row-start-4 rounded-md bg-green-300">
          <WebRTCVideoCall room={roomID ? roomID : ""} />
        </div>
      </div>
    </SignedIn>
  );
}

export default Room;
