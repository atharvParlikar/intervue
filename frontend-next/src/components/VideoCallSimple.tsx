import { useVideoStream } from "@/hooks/useVideoStream";
import { getSocket } from "@/lib/socketChannel";
import { useEffect, useRef, useState } from "react";
import SimplePeer from "simple-peer";
import VideoWithControls from "./VideoWithControls";

export function VideoCallSimple() {
  const { videoStream, streamOn, stopTrack } = useVideoStream();
  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [initiator, setInitiator] = useState<boolean | null>(null);
  const [peerReady, setPeerReady] = useState<boolean>(false);
  const [signal, setSignal] = useState<SimplePeer.SignalData | null>(null);
  const socket = getSocket()!;

  const createPeer = (stream: MediaStream, initiator: boolean) => {
    const peer = new SimplePeer({
      initiator,
      trickle: false,
      stream: stream
    });

    peer.on("signal", (signal) => {
      socket.emit("signal", { signal });
    });

    peer.on("stream", (stream) => {
      console.log("Got stream");
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    });

    peer.on('data', (data) => {
      console.log("Got data: ", data);
    });

    setPeerReady((_) => true);

    return peer;
  }

  useEffect(() => {
    socket.on("initiate", (i) => {
      console.log("I will initiate the call");
      setInitiator(i);
    });

    socket.on("signal", ({ signal }: { signal: SimplePeer.SignalData }) => {
      setSignal(signal);
    });
  }, []);

  useEffect(() => {
    console.log("videoStream: ");
    console.log(videoStream.current);
    console.log(streamOn);
    console.log(initiator !== null);
    console.log(videoStream.current);
    if (!(streamOn && initiator !== null && videoStream.current)) return;

    const peer = createPeer(videoStream.current, initiator);
    peerRef.current = peer;

    console.log("peer created successfully");

  }, [streamOn, initiator]);

  useEffect(() => {
    if (!(signal && peerReady)) return;

    const peer = peerRef.current!;
    peer.signal(signal);
    setSignal((_) => null);
  }, [signal, peerReady]);

  return (
    <div>
      <VideoWithControls stopTrack={stopTrack} videoRef={videoRef} />
    </div>
  );
}
