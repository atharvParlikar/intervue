import {
  Mic,
  MicOff,
  NavigateNext,
  VideocamOffOutlined,
  VideocamOutlined,
} from "@mui/icons-material";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useEffect, useRef, useState } from "react";
import "../App.css";

import IconButton from "./ui/IconButton";
import { trpc } from "../client";
import { useUser } from "@clerk/clerk-react";

type MediaDevice = {
  kind: string;
  deviceId: string;
  label: string;
};

interface VideoSettings {
  video: boolean;
  mic: boolean;
}

function Home_() {
  const [code, setCode] = useState("");
  const videoStream = useRef<MediaStream>(null!);
  const videoElementRef = useRef<HTMLVideoElement>(null!);
  const [videoDevices, setVideoDevices] = useState<MediaDevice[]>(null!);
  const [audioDevices, setAudioDevices] = useState<MediaDevice[]>(null!);
  const [videoDevice, setVideoDevice] = useState<string | null>(null);
  const [audioDevice, setAudioDevice] = useState("default");
  const [videoSettings, setVideoSettings] = useState<VideoSettings>(() => {
    const storedSettings = localStorage.getItem("videoSettings");
    return storedSettings
      ? JSON.parse(storedSettings)
      : { video: true, mic: true }; // default values
  });

  const { isSignedIn } = useUser();

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

  useEffect(() => {
    const setupVideo = async () => {
      videoStream.current = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      videoElementRef.current.srcObject = videoStream.current;
    };

    const getDevices = async () => {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cleanList = devices.map((device) => ({
        kind: device.kind,
        deviceId: device.deviceId,
        label: device.label,
      }));
      setVideoDevices(cleanList.filter((x) => x.kind === "videoinput"));
      setAudioDevices(cleanList.filter((x) => x.kind === "audioinput"));
    };

    setupVideo();
    getDevices();
  }, []);

  useEffect(() => {
    const changeAudioStream = async () => {
      if (videoStream.current) {
        videoStream.current.getAudioTracks()[0].stop();
        videoElementRef.current.srcObject = null;
        videoStream.current = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: {
              exact: videoStream.current.getVideoTracks()[0].getSettings()
                .deviceId,
            },
          },
          audio: { deviceId: { exact: audioDevice } },
        });
        videoElementRef.current.srcObject = videoStream.current;
      }
    };
    changeAudioStream();
  }, [audioDevice]);

  useEffect(() => {
    const changeVideoStream = async () => {
      if (videoStream.current && videoDevice) {
        videoStream.current.getAudioTracks()[0].stop();
        videoElementRef.current.srcObject = null;
        videoStream.current = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: videoDevice } },
          audio: { deviceId: { exact: audioDevice } },
        });
        videoElementRef.current.srcObject = videoStream.current;
      }
    };
    changeVideoStream();
  }, [videoDevice]);

  useEffect(() => {
    if (isSignedIn !== undefined && !isSignedIn) {
      window.location.replace("http://localhost:5173/sign-in");
    }
  }, [isSignedIn]);

  console.log("isSignedIn: ", isSignedIn);

  return (
    <div className="flex flex-col h-screen w-screen items-center justify-center bg-whitesmoke">
      <div className="drop-shadow-lg mb-6">
        <div className="relative group w-full h-full">
          <video
            ref={videoElementRef}
            className="object-cover rounded-xl videoElement border-2 border-black"
            autoPlay
            muted
          />
          <div className="absolute inset-0 bg-black bg-opacity-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center">
            <div className="flex space-x-4 mb-4">
              <IconButton
                backgroundColor={videoSettings.mic ? "#2b2d42" : "#ef233c"}
                Icon={videoSettings.mic ? Mic : MicOff}
                onClick={async () => {
                  if (!videoSettings.mic) {
                    videoStream.current =
                      await navigator.mediaDevices.getUserMedia({
                        video: videoSettings.video,
                        audio: true,
                      });
                    if (videoElementRef.current) {
                      videoElementRef.current.srcObject = videoStream.current;
                    }
                  } else if (videoStream.current) {
                    videoStream.current.getAudioTracks()[0].stop();
                  }

                  setVideoSettings((prevSettings: VideoSettings) => ({
                    ...prevSettings,
                    mic: !prevSettings.mic,
                  }));
                }}
              />

              <IconButton
                backgroundColor={videoSettings.video ? "#2b2d42" : "#ef233c"}
                Icon={
                  videoSettings.video ? VideocamOutlined : VideocamOffOutlined
                }
                onClick={async () => {
                  if (!videoSettings.video) {
                    // Start video stream
                    videoStream.current =
                      await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: videoSettings.mic,
                      });
                    if (videoElementRef.current) {
                      videoElementRef.current.srcObject = videoStream.current;
                    }
                  } else if (videoStream.current) {
                    // Stop video stream
                    videoStream.current.getVideoTracks()[0].stop();
                  }

                  // Toggle video setting and update state/localStorage
                  setVideoSettings((prevSettings: VideoSettings) => ({
                    ...prevSettings,
                    video: !prevSettings.video,
                  }));
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* {videoDevices && (
        <DropdownMenu>
          <DropdownMenuTrigger>Video</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {videoDevices.map((device, index) => {
              return (
                <DropdownMenuLabel
                  key={index}
                  className="cursor-pointer"
                  onClick={() => {
                    setVideoDevice(device.deviceId);
                  }}
                >
                  {device.label}
                </DropdownMenuLabel>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {audioDevices && (
        <DropdownMenu>
          <DropdownMenuTrigger>Audio</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {audioDevices.map((device, index) => {
              return (
                <DropdownMenuLabel
                  key={index}
                  className="cursor-pointer"
                  onClick={() => {
                    console.log("setting mic to ", device.deviceId);
                    setAudioDevice(device.deviceId);
                  }}
                >
                  {device.label}
                </DropdownMenuLabel>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )} */}

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
    </div>
  );
}

export default Home_;
