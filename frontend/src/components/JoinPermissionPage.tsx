import Webcam from "react-webcam";
import { Button } from "./ui/button";
import { ToastContainer } from "react-toastify";
import "../App.css";
import { SignedIn } from "@clerk/clerk-react";
import { RightArrow } from "./ui/Svgs";
import { useContext, useEffect, useState } from "react";
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Room from "./Room";
import { AuthTokenContext } from "../contexts/authtoken-context";

function JoinPermissionPage() {
  const { roomId } = useParams();
  const [renderRoom, setRenderRoom] = useState(false);
  const [isRenderResolved, setIsRenderResolved] = useState(false);
  const token = useContext(AuthTokenContext);
  console.log(token);

  useEffect(() => {
    if (token) {
      (async () => {
        console.log("roomId := ", roomId);
        const res = await axios.post("http://localhost:3000/verify_host", { token });
        console.log(res.status, res.data);
        if (res.data.isHost) {
          setRenderRoom(true);
        } else {
          setRenderRoom(false);
        }
        setIsRenderResolved(true);
      })();
    }
  }, [token]);

  const joinRoom = async () => {
    const res = await axios.post("http://localhost:3000/joinRoom", {
      roomId,
      token
    });

    if (res.status === 201) {
      setRenderRoom(true);
    }
  }

  return (
    <SignedIn>
      {
        isRenderResolved ? (renderRoom ? <Room /> :
          <div className="flex h-screen w-screen items-center justify-center ">
            <div>
              <h1 className="font-thin text-3xl">Say hi to the camera ✨</h1>
              <Webcam className="rounded-lg w-full border-4 border-black drop-shadow-xl videoElement" />
              <div className="mt-2 flex">
                <div className="flex w-full max-w-sm items-center space-x-2">
                  <Button onClick={() => joinRoom()}>
                    <RightArrow />
                    Join Room
                  </Button>
                </div>
              </div>
            </div>
            <ToastContainer />
          </div>) : <div>
          Loading...
        </div>
      }
    </SignedIn>
  );
}

export default JoinPermissionPage;
