import { useEffect, useRef, useState, useContext } from "react";
import Peer from 'peerjs'
import { socketContext } from "../socket";
import VideoRender from "./VideoRender";
import { VideoSettingsContext } from "../contexts/video-settings";
import { AuthTokenContext } from "../contexts/authtoken-context";

interface props {
  userType: string
};

interface VideoRenderHandles {
  getLocalVideo: () => HTMLVideoElement | null;
  getRemoteVideo: () => HTMLVideoElement | null;
}

function VideoCall({ userType }: props) {
  const [peerId, setPeerId] = useState('');
  const [remotePeerId, setRemotePeerId] = useState('');
  const peerInstance = useRef<Peer | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const token = useContext(AuthTokenContext);

  const socket = useContext(socketContext);
  const { videoSettings } = useContext(VideoSettingsContext)!;

  const videoRenderRef = useRef<VideoRenderHandles>(null);


  const call = async (peerId: string) => {
    if (peerInstance.current) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: videoSettings.video, audio: videoSettings.mic });
      localStream.current = stream;

      //  TODO: : handle case where call_ is undefined.
      const call_ = peerInstance.current?.call(peerId, localStream.current);

      call_?.on("stream", (remoteStream) => {
        const remoteVideo = videoRenderRef.current?.getRemoteVideo();
        if (remoteVideo) {
          remoteVideo.srcObject = remoteStream;
        }
      });
    }
  }


  useEffect(() => {
    const peer = new Peer();

    peer.on('open', (id) => {
      setPeerId(id);
    });

    peer.on('call', async (call) => {
      console.log("got a call");
      const stream = await navigator.mediaDevices.getUserMedia({ video: videoSettings.video, audio: videoSettings.mic });
      localStream.current = stream;
      const localVideo = videoRenderRef.current?.getLocalVideo();
      if (localVideo && localVideo.srcObject) {
        call.answer(localStream.current);
        call.on("stream", (remoteStream) => {
          const remoteVideo = videoRenderRef.current?.getRemoteVideo();
          if (remoteVideo) {
            remoteVideo.srcObject = remoteStream;
          }
        });
      }

    });

    peerInstance.current = peer;
  }, []);

  useEffect(() => {
    if (localStream.current) {
      localStream.current.getVideoTracks()[0].enabled = videoSettings.video;
      localStream.current.getAudioTracks()[0].enabled = videoSettings.mic;
    }
  }, [videoSettings]);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: videoSettings.video, audio: videoSettings.mic })
      .then((mediaStream: MediaStream) => {
        const localVideo = videoRenderRef.current?.getLocalVideo();
        if (localVideo) {
          localVideo.srcObject = mediaStream;
        }
      });
  }, []);

  useEffect(() => {
    if (socket.connected) {
      socket.on("connectionReady", (peerId: string) => {
        setRemotePeerId(peerId);
        call(peerId);
      });
    }

    return () => {
      socket.off("connectionReady");
    }
  }, [socket]);

  useEffect(() => {
    if (socket.connected && peerId.length > 0) {
      console.log("sending connectionReady with peerId: ", peerId);
      socket.emit('connectionReady', JSON.stringify({
        token,
        peerId
      }));
    }
  }, [peerId, socket]);

  return (
    <>
      <VideoRender ref={videoRenderRef} />
    </>
  )
}

export default VideoCall;
