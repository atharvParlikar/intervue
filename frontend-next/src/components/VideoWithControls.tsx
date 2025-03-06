import { Skeleton } from "@/components/ui/skeleton";
import { usePathname } from "next/navigation";
import { RefObject, useEffect } from "react";
import { useStore } from "@/contexts/store";
import { Button } from "./ui/button";

interface VideoComponentProps {
  width?: string;
  height?: string;
  videoRef: ((node: HTMLVideoElement) => void) | RefObject<HTMLVideoElement | null>;
  streamOn?: boolean;
  stopTrack: ({ video, audio }: { video?: boolean, audio?: boolean }) => void;
  selfVideo?: boolean;
  muted?: boolean;
  videoLocal?: boolean;
}

const VideoWithControls = ({
  width = "640px",
  height = "480px",
  videoRef,
  streamOn = true,
  stopTrack,
  selfVideo = false,
  muted = true,
  videoLocal = true
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

  useEffect(() => {
    if (videoLocal) {
    }
  }, [cameraOn, micOn]);

  return (
    <>
      {streamOn ? (
        <div
          className="h-full w-full rounded-md relative group"
        >
          <video
            ref={videoRef}
            className="localVideo rounded-md shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-shadow duration-300"
            autoPlay
            muted={muted}
          />

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
            selfVideo &&
            <Skeleton className="rounded-md" style={{ width, height }} />
          }
        </div>
      )}
    </>
  );
};

export default VideoWithControls;
