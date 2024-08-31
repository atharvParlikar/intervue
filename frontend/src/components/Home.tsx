import Webcam from "react-webcam";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ToastContainer, toast } from "react-toastify";
import "../App.css";
import { SignedIn } from "@clerk/clerk-react";
import { useUser } from "@clerk/clerk-react";
import { useContext, useState } from "react";
import axios from 'axios';
import { FilmCamera, RightArrow } from "./ui/Svgs";
import { AuthTokenContext } from "../contexts/authtoken-context";

function Home() {
  const { isSignedIn, isLoaded } = useUser();
  const [code, setCode] = useState("");
  const token = useContext(AuthTokenContext);


  const generateRandomId = (): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 4; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }

  const createRoom = async () => {
    const roomId = generateRandomId();
    const response = await axios.post("http://localhost:3000/createRoom", { roomId, token });

    if (response.status === 201) {
      joinRoom(roomId);
    } else {
      toast("Internal Server error", { type: "error", pauseOnHover: false });
    }
  };

  const joinRoom = (roomId: string) => {
    window.location.replace("http://localhost:5173/room/" + roomId);
  };

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
              <FilmCamera />
              Create Room
            </Button>

            <div className="flex w-full max-w-sm items-center space-x-2">
              <Input
                onChange={(e) => setCode(e.target.value)}
                value={code}
                placeholder="Code"
              />
              <Button onClick={() => joinRoom(code)}>
                <RightArrow />
                Join Room
              </Button>
            </div>
          </div>
        </div>
        <ToastContainer />
      </div>
    </SignedIn>
  );
}

export default Home;
