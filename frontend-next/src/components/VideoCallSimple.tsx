import { useVideoStream } from "@/hooks/useVideoStream";
import { getSocket } from "@/lib/socketChannel";
import { useEffect, useRef, useState } from "react";
import SimplePeer from "simple-peer";
import VideoWithControls from "./VideoWithControls";
import { useStore } from "@/contexts/store";
import toast from "react-hot-toast";

export function VideoCallSimple() {
  const { videoStream, streamOn } = useVideoStream();
  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [initiator, setInitiator] = useState<boolean | null>(null);
  const [signal, setSignal] = useState<SimplePeer.SignalData | null>(null);
  const socket = getSocket()!;
  const { cameraOn, micOn } = useStore();
  const localMediaState = useRef({
    video: cameraOn,
    micOn: micOn
  });

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

    peer.on("connect", () => {
      console.log("peer connected");
    })

    return peer;
  }

  const processSignal = (signal: SimplePeer.SignalData) => {
    if (signal.type === "answer") {
      // meaning this client is the initiator
      const peer = peerRef.current!;
      peer.signal(signal);
    } else if (signal.type === "offer") {
      setSignal(signal);
    }
  }

  // This effect applies only to the non-initiator.
  // For the initiator, the peer and stream are already set up before receiving
  // the "signal" socket message, which will always be an answer.
  // Since the initiator directly handles answers in processSignal,
  // we only need to check for videoStream and signal here.
  useEffect(() => {
    if (!(videoStream.current && signal)) return;

    const peer = createPeer(videoStream.current, false);
    peerRef.current = peer;
    peer.signal(signal);
  }, [signal, streamOn]);

  useEffect(() => {
    socket.on("initiate", (i) => {
      console.log("to initiate: ", i);
      if (!i) return;
      console.log("I will initiate the call");
      setInitiator(i);
    });

    socket.on("signal", ({ signal }: { signal: SimplePeer.SignalData }) => {
      console.log("got signal");
      processSignal(signal);
    });

    socket.on("refresh-video", () => {
      console.log("refreshing video");
      if (!videoRef.current) return;
      videoRef.current.srcObject = videoRef.current.srcObject;
    });

    socket.on("peer-disconnected", () => {
      if (!peerRef.current) return;

      peerRef.current.destroy();
      toast("Peer left the room");
      setInitiator(false);
    });
  }, []);

  useEffect(() => {
    if (!(streamOn && initiator && videoStream.current)) return;

    const peer = createPeer(videoStream.current, initiator);
    peerRef.current = peer;

    console.log("peer created successfully");
  }, [streamOn, initiator]);

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
