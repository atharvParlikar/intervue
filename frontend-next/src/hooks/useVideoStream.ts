import { useEffect, useRef, useState } from "react";

export const useVideoStream = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoStream = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);

  const stopTracks = () => {
    videoStream.current?.getTracks().forEach((track) => track.stop());
  };

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
    return stopTracks;
  }, []);

  useEffect(() => {
    if (videoRef.current && videoStream.current) {
      videoRef.current.srcObject = videoStream.current;
    }
  }, [videoRef.current, videoStream.current]);

  return { videoRef, cameraOn, stopTracks };
};
