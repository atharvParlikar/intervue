import { useVideoStream } from "@/hooks/useVideoStream";
import { getSocket } from "@/lib/socketChannel";
import { useEffect, useRef, useState } from "react";
import SimplePeer from "simple-peer";
import VideoWithControls from "./VideoWithControls";
import { useStore } from "@/contexts/store";

export function VideoCallSimple() {
  const { videoStream, streamOn, stopTrack } = useVideoStream();
  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [initiator, setInitiator] = useState<boolean | null>(null);
  const [peerReady, setPeerReady] = useState<boolean>(false);
  const [signal, setSignal] = useState<SimplePeer.SignalData | null>(null);
  const socket = getSocket()!;
  const { cameraOn, micOn } = useStore();
  const localMediaState = useRef({
    video: cameraOn,
    micOn: micOn
  })

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

    socket.on("refresh-video", () => {
      console.log("refreshing video");
      if (!videoRef.current) return;
      videoRef.current.srcObject = videoRef.current.srcObject;
    });
  }, []);

  useEffect(() => {
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

  useEffect(() => {
    if (!(videoStream.current && peerRef.current)) return;

    if (cameraOn !== localMediaState.current.video) {
      // Simple approach: enable/disable existing tracks
      const videoTracks = videoStream.current.getTracks().filter(t => t.kind === "video");
      console.log(videoTracks);

      if (videoTracks.length > 0) {
        // If we have existing tracks, just enable/disable them
        videoTracks.forEach(track => {
          if (!cameraOn) {
            track.enabled = false;
            track.stop();
          } else {
            navigator.mediaDevices.getUserMedia({ video: true })
              .then((newStream) => {
                const oldVideoTrack = videoStream.current?.getTracks().find(t => t.kind === "video")!;
                const newVideoTrack = newStream.getTracks().find(t => t.kind === "video");
                if (!newVideoTrack) return;

                peerRef.current?.replaceTrack(oldVideoTrack, newVideoTrack, videoStream.current!);
                socket.emit("refresh-video");

                localMediaState.current.video = true;
              })
              .catch(err => {
                console.error("Error accessing camera:", err);
              });
          }
        });

        localMediaState.current.video = cameraOn;
      }
    }
  }, [cameraOn, micOn]);

  return (
    <div>
      <VideoWithControls stopTrack={() => { }} videoRef={videoRef} />
    </div>
  );
}
