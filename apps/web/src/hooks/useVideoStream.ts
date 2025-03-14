import { useStore } from "@/contexts/store";
import { useCallback, useEffect, useRef, useState } from "react";

type useVideoStreamArgs = boolean;

export const useVideoStream = (local: useVideoStreamArgs = true) => {
  const videoStream = useRef<MediaStream | null>(null);
  const [streamOn, setStreamOn] = useState(false);
  const videoNode = useRef<HTMLVideoElement | null>(null);
  const { cameraOn, setCameraOn, micOn, setMicOn } = useStore();

  const stopTrack = ({ video, audio }: { video?: boolean; audio?: boolean }) => {
    console.log('stopTrack called');
    if (video) {
      setCameraOn(false);
    }
    if (audio) {
      setMicOn(false);
    }
  };

  const videoRef = useCallback((node: HTMLVideoElement) => {
    if (!node) return;
    videoNode.current = node;
    node.srcObject = videoStream.current;
  }, []);

  useEffect(() => {
    const setupStreams = async () => {
      if (!videoStream.current) {
        try {
          if (!(cameraOn || micOn)) return;

          const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: cameraOn,
            audio: micOn,
          });
          videoStream.current = mediaStream;
          setStreamOn((_) => true);
        } catch (error) {
          console.error("Error accessing media devices:", error);
        }
      }
    };

    setupStreams();
  }, []);

  // For detecting changes in cameraOn and micOn in local stream.
  useEffect(() => {
    if (!local) return;
    if (!cameraOn) {
      videoStream.current?.getTracks().filter(track => track.kind === "video").forEach(track => {
        track.stop();
        videoStream.current?.removeTrack(track);
      });
    } else if (videoStream.current) {
      navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
        const videoTrack = stream.getTracks().find(track => track.kind === "video")!;
        videoStream.current?.addTrack(videoTrack);
      });
    }
  }, [cameraOn]);

  useEffect(() => {
    if (!local) return;
    if (!micOn) {
      videoStream.current?.getTracks().filter(track => track.kind === "audio").forEach(track => {
        track.stop();
        videoStream.current?.removeTrack(track);
      });
    } else if (videoStream.current) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        const audioTrack = stream.getTracks().find(track => track.kind === "audio")!;
        videoStream.current?.addTrack(audioTrack);
      });
    }
  }, [micOn]);

  return { videoStream, streamOn, videoRef, stopTrack };
};
