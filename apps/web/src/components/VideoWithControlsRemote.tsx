import { RefObject, useEffect } from "react";
import { useStore } from "@/contexts/store";
import { Button } from "./ui/button";
import { CameraOff, MicOff } from "lucide-react";

interface VideoComponentProps {
  width?: string;
  height?: string;
  videoRef: ((node: HTMLVideoElement) => void) | RefObject<HTMLVideoElement | null>;
  selfVideo?: boolean;
  muted?: boolean;
}

const VideoWithControlsRemote = ({
  videoRef,
  muted = true,
}: VideoComponentProps) => {
  const { peerConnected, cameraOn, setCameraOn, micOn, setMicOn, remoteCameraOn, remoteMicOn } = useStore();

  const handleVideoButton = () => {
    setCameraOn(!cameraOn);
  }

  const handleAudioButton = () => {
    setMicOn(!micOn);
  }

  return (
    <>
      <div className="h-full w-full rounded-md relative group">
        {/* Always keep video in DOM */}
        <video
          ref={videoRef}
          className={`localVideo rounded-md shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-shadow duration-300 ${peerConnected && remoteCameraOn ? "block" : "hidden"
            }`}
          autoPlay
          muted={muted}
        />

        {/* Show camera/mic off icons only when peer is connected but camera is off */}
        <div
          className={`h-full w-full gap-6 justify-center items-center ${peerConnected && !remoteCameraOn ? "flex" : "hidden"
            }`}
        >
          <CameraOff />
          {!remoteMicOn && <MicOff />}
        </div>

        {/* Show "Peer not connected" when peer is not connected */}
        <div
          className={`h-full w-full flex justify-center items-center ${peerConnected ? "hidden" : "flex"
            }`}
        >
          Peer not connected...
        </div>

        {/* Video Controls */}
        <div className="absolute inset-2 flex items-end justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex gap-6">
            <Button onClick={handleVideoButton} className="rounded-full">
              {cameraOn ? "Camera on" : "Camera off"}
            </Button>
            <Button onClick={handleAudioButton} className="rounded-full">
              {micOn ? "Mic on" : "Mic off"}
            </Button>
          </div>
        </div>
      </div>

    </>
  );
};

export default VideoWithControlsRemote;
