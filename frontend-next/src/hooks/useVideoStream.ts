import { TrackChangeT, useStore } from "@/contexts/store";
import { useCallback, useEffect, useRef, useState } from "react";

export const useVideoStream = () => {
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
          console.log("video: ", cameraOn, " ;; audio: ", micOn);
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

  // For detecting changes in cameraOn and micOn.
  useEffect(() => {
    if (!cameraOn) {
      videoStream.current?.getTracks().filter(track => track.kind === "video").forEach(track => {
        track.stop()
        videoStream.current?.removeTrack(track);
      })
    }
    if (!micOn) {
      videoStream.current?.getTracks().filter(track => track.kind === "audio").forEach(track => {
        track.stop()
        videoStream.current?.removeTrack(track);
      })
    }
    if (videoStream.current) {
      if (cameraOn) {
        navigator.mediaDevices
          .getUserMedia({
            video: cameraOn,
          })
          .then((mediaStream) => {
            const track = mediaStream.getVideoTracks()[0]
            videoStream.current?.addTrack(track);
            if (!videoNode.current) return;
            videoNode.current.srcObject = videoNode.current?.srcObject;
          });
      }
      if (micOn) {
        navigator.mediaDevices
          .getUserMedia({
            audio: micOn,
          })
          .then((mediaStream) => {
            const track = mediaStream.getAudioTracks()[0];
            videoStream.current?.addTrack(track);
            if (!videoNode.current) return;
            videoNode.current.srcObject = videoNode.current?.srcObject;
          });
      }
    }
  }, [cameraOn, micOn]);

  return { videoStream, streamOn, videoRef, stopTrack };
};


