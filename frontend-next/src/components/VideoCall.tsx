import { usePathname } from "next/navigation";
import { useVideoStream } from "@/hooks/useVideoStream";
import { useEffect, useRef } from "react";
import { MediaConnection, Peer } from "peerjs";
import { useStore } from "@/contexts/store";
import VideoWithControls from "./VideoWithControls";
import { Button } from "./ui/button";

export function VideoCall() {
  const { peerSocketId, socketId } = useStore();
  const { videoStream, streamOn, stopTrack } = useVideoStream();
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const callRef = useRef<MediaConnection | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!socketId || !videoStream.current) return;

    const stream = videoStream.current;

    const peer = new Peer(socketId, {
      host: "localhost",
      port: 9000,
      path: "/frontend",
    });

    peerRef.current = peer;

    peer.on("call", (call) => {
      callRef.current = call;
      call.answer(stream);
      call.on("stream", (remoteStream: MediaStream) => {
        remoteStreamRef.current = remoteStream;
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      });
    });

    return () => {
      peer.destroy();
    };
  }, [socketId, streamOn]);

  // Only the second peer (the one who joins last) gets peerSocketId and triggers this
  useEffect(() => {
    if (!peerSocketId || !peerRef.current || !videoStream.current) return;

    const call = peerRef.current.call(peerSocketId, videoStream.current);
    callRef.current = call;

    call.on("stream", (remoteStream: MediaStream) => {
      console.log("getting stream");
      remoteStreamRef.current = remoteStream;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    });
  }, [peerSocketId, peerRef.current, streamOn]);

  useEffect(() => {
    return () => stopTrack({ video: true, audio: true });
  }, [pathname]);

  return (
    <div>
      <VideoWithControls videoRef={remoteVideoRef} stopTrack={stopTrack} streamOn={streamOn} />
      <Button onClick={() => console.log(callRef.current?.peerConnection.getSenders())}>Debug</Button>
    </div>
  );
}
