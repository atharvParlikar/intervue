import { Skeleton } from "@/components/ui/skeleton";
import { RefObject } from "react";
import { useStore } from "@/contexts/store";
import { Button } from "./ui/button";
import { CameraOff, MicOff } from "lucide-react";

interface VideoComponentProps {
  width?: string;
  height?: string;
  videoRef: ((node: HTMLVideoElement) => void) | RefObject<HTMLVideoElement | null>;
  streamOn?: boolean;
  stopTrack: ({ video, audio }: { video?: boolean, audio?: boolean }) => void;
  selfVideo?: boolean;
  muted?: boolean;
}

const VideoWithControlsLocal = ({
  width = "640px",
  height = "480px",
  videoRef,
  streamOn = true,
  stopTrack,
  selfVideo = false,
  muted = true,
}: VideoComponentProps) => {
  const { cameraOn, setCameraOn, micOn, setMicOn } = useStore();

  const handleVideoButton = () => {
    if (cameraOn) {
      stopTrack({ video: true });
      return;
    }
    setCameraOn(true);
  }

  const handleAudioButton = () => {
    if (micOn) {
      stopTrack({ audio: true });
      return;
    }
    setMicOn(true);
  }

  return (
    <>
      {streamOn ? (
        <div
          className="h-full w-full rounded-md relative group"
        >
          {
            cameraOn ?
              <video
                ref={videoRef}
                className="localVideo rounded-md shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-shadow duration-300"
                autoPlay
                muted={muted}
              /> : (
                <div style={{ width, height }} className="flex gap-6 justify-center items-center">
                  <CameraOff />
                  {
                    micOn ? <></> : <MicOff />
                  }
                </div>
              )
          }

          <div className="absolute inset-2 flex items-end justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex gap-6">
              <Button
                onClick={handleVideoButton}
                className={`rounded-full`}
              >
                {/* This is an icon, not a media player */}
                {cameraOn ? "Camera on" : "Camera off"}
              </Button>
              <Button
                onClick={handleAudioButton}
                className={`rounded-full`}
              >
                {micOn ? "Mic on" : "Mic off"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {
            <Skeleton className="rounded-md" style={{ width, height }} />
          }
        </div>
      )}
    </>
  );
};

export default VideoWithControlsLocal;
