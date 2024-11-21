import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { ToastContainer } from "react-toastify";
import "../App.css";
import { SignedIn } from "@clerk/clerk-react";
import { useUser } from "@clerk/clerk-react";
import { useEffect, useRef, useState } from "react";
import IconButton from "../components/ui/IconButton";
import {
  Mic,
  MicOff,
  VideocamOutlined,
  VideocamOffOutlined,
  NavigateNext,
} from "@mui/icons-material";
import { trpc } from "../client";

function Home() {
  const { isSignedIn, isLoaded } = useUser();
  const [code, setCode] = useState("");
  const localVideo = useRef<HTMLVideoElement>(null!);
  const localStream = useRef<MediaStream | null>(null);
  const { videoSettings, updateVideoSettings } = useStore();

  useEffect(() => {
    const setupStreams = async () => {
      localStream.current = await navigator.mediaDevices.getUserMedia({
        video: videoSettings.video,
        audio: videoSettings.mic,
      });
    };

    setupStreams();
  }, []);

  useEffect(() => {
    if (localVideo.current && localStream.current) {
      console.log("Both are here bitch");
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((mediaStream) => {
          localVideo.current.srcObject = mediaStream;
        });
      localVideo.current.srcObject = localStream.current;
    }
  }, [localVideo.current, localStream.current]);

  useEffect(() => {
    if (localStream.current) {
      localStream.current.getVideoTracks()[0].enabled = videoSettings.video;
      localStream.current.getAudioTracks()[0].enabled = videoSettings.mic;
    }
  }, [videoSettings]);

  const createRoomMutation = trpc.createRoom.useMutation({
    onSuccess: (data) => {
      window.location.replace("http://localhost:5173/room/" + data.roomId);
    },
    onError: (error) => {
      console.error("ERROR: ", error);
    },
  });

  const generateRandomId = (): string => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let id = "";
    for (let i = 0; i < 4; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  };

  const createRoom = async () => {
    const roomId = generateRandomId();
    createRoomMutation.mutate({ roomId });
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
      <div className="flex flex-col h-screen w-screen items-center justify-center bg-whitesmoke">
        <div className="drop-shadow-lg mb-6">
          <div className="relative group w-full h-full">
            <video
              ref={localVideo}
              className="object-cover rounded-xl videoElement border-2 border-black"
              autoPlay
              muted
            />
            <div className="absolute inset-0 bg-black bg-opacity-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center">
              <div className="flex space-x-4 mb-4">
                <IconButton
                  backgroundColor={videoSettings.mic ? "#2b2d42" : "#ef233c"}
                  Icon={videoSettings.mic ? Mic : MicOff}
                  onClick={() =>
                    updateVideoSettings({
                      ...videoSettings,
                      mic: !videoSettings.mic,
                    })
                  }
                />
                <IconButton
                  backgroundColor={videoSettings.video ? "#2b2d42" : "#ef233c"}
                  Icon={
                    videoSettings.video ? VideocamOutlined : VideocamOffOutlined
                  }
                  onClick={() =>
                    updateVideoSettings({
                      ...videoSettings,
                      video: !videoSettings.video,
                    })
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <Button className="px-4 py-8 bg-darkslategray" onClick={createRoom}>
            <VideocamOutlined className="mr-2" />
            Create Room
          </Button>

          <div className="mx-4 w-[2px] border border-gray-400 drop-shadow-md" />

          <div className="flex w-full max-w-sm items-center space-x-2">
            <Input
              onChange={(e) => setCode(e.target.value)}
              value={code}
              placeholder="Code"
              className="py-8 w-80 border border-gray-400 drop-shadow-md px-4"
            />
            <Button onClick={() => {}} className="px-4 py-8 bg-darkslategray">
              <NavigateNext />
              Join Room
            </Button>
          </div>
        </div>
        <ToastContainer />
      </div>
    </SignedIn>
  );
}

export default Home;
