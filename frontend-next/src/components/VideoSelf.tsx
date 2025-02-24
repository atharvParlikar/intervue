import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface VideoComponentProps {
  width?: string;
  height?: string;
}

const VideoSelf = ({
  width = "640px",
  height = "480px",
}: VideoComponentProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoStream = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);

  useEffect(() => {
    const setupStreams = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        videoStream.current = mediaStream;
        setCameraOn(true);
      } catch (error) {
        console.error("Error accessing media devices:", error);
      }
    };

    setupStreams();

    return () => {
      videoStream.current?.getTracks().forEach((track) => {
        track.stop();
      });
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && videoStream.current) {
      videoRef.current.srcObject = videoStream.current;
    }
  }, [videoRef.current, videoStream.current]);

  return (
    <>
      {cameraOn ? (
        <video
          ref={videoRef}
          className="localVideo rounded-md shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-shadow duration-300"
          autoPlay
          muted
          style={{ width, height }}
        />
      ) : (
        <Skeleton className="rounded-md" style={{ width, height }} />
      )}
    </>
  );
};

export default VideoSelf;
