import Webcam from "react-webcam";
import { Button } from "./ui/button";
import { v4 } from "uuid";
import { Input } from "./ui/input";
import "../App.css";
import { SignedIn } from "@clerk/clerk-react";
import { useUser } from "@clerk/clerk-react";
import { useState } from "react";

function Home() {
  const createRoom = async () => {
    const roomId = v4();
    joinRoom(roomId);
  };

  const joinRoom = (roomId: string) => {
    window.location.replace("http://localhost:5173/room/" + roomId);
  };

  const { isSignedIn, isLoaded } = useUser();
  const [code, setCode] = useState("");

  if (isLoaded) {
    console.log("Loaded");
    if (!isSignedIn) {
      console.log("Redirecting");
      window.location.replace("http://localhost:5173/sign-in");
    }
  } else {
    return null;
  }

  return (
    <SignedIn>
      <div className="flex h-screen w-screen items-center justify-center ">
        <div>
          <h1 className="font-thin text-3xl">Say hi to the camera ✨</h1>
          <Webcam className="rounded-lg w-full border-4 border-black drop-shadow-xl videoElement" />
          <div className="mt-2 flex">
            <Button className="mr-3" onClick={createRoom}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 16 16"
                className="mr-2"
              >
                <path d="M6 3a3 3 0 1 1-6 0 3 3 0 0 1 6 0" />
                <path d="M9 6a3 3 0 1 1 0-6 3 3 0 0 1 0 6" />
                <path d="M9 6h.5a2 2 0 0 1 1.983 1.738l3.11-1.382A1 1 0 0 1 16 7.269v7.462a1 1 0 0 1-1.406.913l-3.111-1.382A2 2 0 0 1 9.5 16H2a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
              </svg>
              Create Room
            </Button>

            <div className="flex w-full max-w-sm items-center space-x-2">
              <Input
                onChange={(e) => setCode(e.target.value)}
                value={code}
                placeholder="Code"
              />
              <Button onClick={joinRoom}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  className="mr-2"
                  viewBox="0 0 16 16"
                >
                  <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0M4.5 7.5a.5.5 0 0 0 0 1h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5z" />
                </svg>
                Join Room
              </Button>
            </div>
          </div>
        </div>
      </div>
    </SignedIn>
  );
}

export default Home;
