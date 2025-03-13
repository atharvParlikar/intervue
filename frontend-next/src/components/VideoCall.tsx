import { useVideoStream } from "@/hooks/useVideoStream";
import { getSocket } from "@/lib/socketChannel";
import { useEffect, useRef, useState } from "react";
import SimplePeer from "simple-peer";
import VideoWithControlsRemote from "./VideoWithControlsRemote";
import { useStore } from "@/contexts/store";
import toast from "react-hot-toast";

export function VideoCall() {
  const { videoStream, streamOn } = useVideoStream(false);
  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const [initiator, setInitiator] = useState<boolean | null>(null);
  const [signal, setSignal] = useState<SimplePeer.SignalData | null>(null);
  const socket = getSocket()!;
  const { setPeerConnected, cameraOn, micOn, setRemoteCameraOn, setRemoteMicOn } = useStore();

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
      remoteStream.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setPeerConnected(true);
      socket.emit("remoteCameraOn", cameraOn);
      socket.emit("remoteMicOn", micOn);
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

  // setup socket events
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
      setPeerConnected(false);
    });

    socket.on("remoteCameraOn", (cameraOn) => {
      console.log("Got remoteCameraOn")
      setRemoteCameraOn(cameraOn);
      if (!videoRef.current) return;
      videoRef.current.srcObject = videoRef.current.srcObject;
    });

    socket.on("remoteMicOn", (micOn) => {
      console.log("Got remoteMicOn")
      setRemoteMicOn(micOn);
      if (!videoRef.current) return;
      videoRef.current.srcObject = videoRef.current.srcObject;
    });
  }, []);

  useEffect(() => {
    if (!(streamOn && initiator && videoStream.current)) return;

    const peer = createPeer(videoStream.current, initiator);
    peerRef.current = peer;

    console.log("peer created successfully");
  }, [streamOn, initiator]);

  useEffect(() => {
    if (!videoStream.current) return;

    if (!cameraOn) {
      const track = videoStream.current.getTracks().find(track => track.kind === "video");
      if (!track || !peerRef.current) return;
      track.enabled = false;
      track.stop();
      socket.emit("refresh-video");
      socket.emit("remoteCameraOn", false);
    } else {
      if (!peerRef.current) return;
      const peer = peerRef.current;
      navigator.mediaDevices.getUserMedia({
        video: true
      }).then(stream => {
        const oldVideoTrack = videoStream.current?.getTracks().find(track => track.kind === "video");
        const newVideoTrack = stream.getTracks().find(track => track.kind === "video");
        if (!newVideoTrack || !oldVideoTrack) return;
        peer.replaceTrack(oldVideoTrack, newVideoTrack, videoStream.current!);
        socket.emit("remoteCameraOn", true);
        socket.emit("refresh-video");
      });
    }
  }, [cameraOn]);

  useEffect(() => {
    if (!videoStream.current) return;

    if (!micOn) {
      const track = videoStream.current.getTracks().find(track => track.kind === "video");
      if (!track) return;
      track.enabled = false;
      track.stop();
      socket.emit("remoteMicOn", false);
    } else {
      if (!peerRef.current) return;

      const peer = peerRef.current;
      navigator.mediaDevices.getUserMedia({
        audio: true
      }).then(stream => {
        const oldAudioTrack = videoStream.current?.getTracks().find(track => track.kind === "audio");
        const newAudioTrack = stream.getTracks().find(track => track.kind === "audio");
        if (!newAudioTrack || !oldAudioTrack) return;
        peer.replaceTrack(oldAudioTrack, newAudioTrack, videoStream.current!);
        socket.emit("remoteAudioOn", true);
      })
    }
  }, []);

  return (
    <div className="h-full w-full">
      <VideoWithControlsRemote videoRef={videoRef} />
    </div>
  );
}
