import { useStore } from "@/contexts/store";
import { useCallback, useEffect, useRef, useState } from "react";

export const useVideoStream = () => {
  const videoStream = useRef<MediaStream | null>(null);
  const [streamOn, setStreamOn] = useState(false);
  const [videoRefMounted, setVideoRefMounted] = useState(false);
  const actualVideoRef = useRef<HTMLVideoElement | null>(null);
  const { cameraOn, micOn } = useStore();

  const stopTrack = ({ video, audio }: { video: boolean; audio: boolean }) => {
    console.log("[stopTrack]: ", { video, audio });
    videoStream.current?.getTracks().forEach((track) => {
      if (
        (video && track.kind === "video") ||
        (audio && track.kind === "audio")
      ) {
        track.stop();
        videoStream.current?.removeTrack(track);
      }
    });
  };

  const videoRef = useCallback((node: HTMLVideoElement) => {
    if (!node) return;
    setVideoRefMounted(true);
    actualVideoRef.current = node;
  }, []);

  useEffect(() => {
    const setupStreams = async () => {
      if (!videoStream.current) {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: cameraOn,
            audio: micOn,
          });
          videoStream.current = mediaStream;
          setStreamOn(true);
        } catch (error) {
          console.error("Error accessing media devices:", error);
        }
      }
    };

    setupStreams();
  }, []);

  useEffect(() => {
    if (videoRefMounted && actualVideoRef.current && streamOn) {
      actualVideoRef.current.srcObject = videoStream.current;
    }
  }, [videoRefMounted, streamOn]);

  // For detecting changes in cameraOn and micOn.
  useEffect(() => {
    if (videoStream.current) {
      if (!cameraOn) {
        stopTrack({ video: true, audio: false });
      }
      if (!micOn) {
        stopTrack({ video: false, audio: true });
      }
      if (cameraOn) {
        navigator.mediaDevices
          .getUserMedia({
            video: cameraOn,
          })
          .then((mediaStream) => {
            videoStream.current?.addTrack(mediaStream.getVideoTracks()[0]);
          });
      }
      if (micOn) {
        navigator.mediaDevices
          .getUserMedia({
            audio: micOn,
          })
          .then((mediaStream) => {
            videoStream.current?.addTrack(mediaStream.getAudioTracks()[0]);
          });
      }
    }
  }, [cameraOn, micOn]);

  return { videoStream, streamOn, videoRef, stopTrack };
};
