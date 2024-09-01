import { useEffect, useRef, useState, useContext } from "react";
import Peer, { MediaConnection } from 'peerjs'
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
  const [_, setRemotePeerId] = useState('');
  const peerInstance = useRef<Peer | null>(null);
  const callInstance = useRef<MediaConnection | null>(null);
  const token = useContext(AuthTokenContext);
  const mediaStreamLocal = useRef<MediaStream | null>(null);
  const mediaStreamRemote = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);

  const socket = useContext(socketContext);
  const { videoSettings } = useContext(VideoSettingsContext)!;

  const videoRenderRef = useRef<VideoRenderHandles>(null);


  const call = async (peerId: string) => {
    if (peerInstance.current && mediaStreamRemote.current) {
      //  TODO: : handle case where call_ is undefined.
      const call_ = peerInstance.current?.call(peerId, mediaStreamRemote.current);
      callInstance.current = call_;

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
      if (mediaStreamRemote.current) {
        console.log("got a call");
        const localVideo = videoRenderRef.current?.getLocalVideo();
        if (localVideo && localVideo.srcObject) {
          call.answer(mediaStreamRemote.current);
          call.on("stream", (remoteStream_) => {
            remoteStream.current = remoteStream_;
            const remoteVideo = videoRenderRef.current?.getRemoteVideo();
            if (remoteVideo) {
              remoteVideo.srcObject = remoteStream.current;
            }
          });
        }
      }
    });

    peerInstance.current = peer;
  }, [mediaStreamRemote]);

  useEffect(() => {
    (async () => {
      const localVideo = videoRenderRef.current?.getLocalVideo();
      if (localVideo) {
        localVideo.srcObject = mediaStreamLocal.current;
      }
      if (callInstance.current && mediaStreamRemote.current) {
        callInstance.current?.peerConnection.getSenders()[0].replaceTrack(mediaStreamRemote.current.getTracks()[0]);
      }
    })();
  }, [videoSettings.camera]);

  useEffect(() => {
    (async () => {
      mediaStreamLocal.current = await navigator.mediaDevices.getUserMedia({ video: videoSettings.camera, audio: videoSettings.mic });
      mediaStreamRemote.current = await navigator.mediaDevices.getUserMedia({ video: videoSettings.camera, audio: videoSettings.mic });
    })();
  }, []);

  useEffect(() => {
    if (mediaStreamLocal.current) {
      if (!videoSettings.camera) {
        mediaStreamLocal.current.getTracks().forEach(track => {
          if (track.kind === 'video') {
            track.stop();
          }
        })
      } else {
        mediaStreamLocal.current.getTracks().forEach(async track => {
          if (track.kind === "video") {
            const newTrack = (await navigator.mediaDevices.getUserMedia({ video: videoSettings.camera, audio: videoSettings.mic }))
              .getTracks()
              .filter(track => track.kind === "video")[0];
            const trackToRemove = mediaStreamLocal.current?.getTracks().filter(track => track.kind === "video")[0];
            mediaStreamLocal.current?.removeTrack(trackToRemove!);
            mediaStreamLocal.current?.addTrack(newTrack);
          }
        });
      }
    }

    if (mediaStreamRemote.current) {
      if (!videoSettings.camera) {
        mediaStreamRemote.current.getTracks().forEach(track => {
          if (track.kind === 'video') {
            track.stop();
          }
        })
      } else {
        mediaStreamRemote.current.getTracks().forEach(async track => {
          if (track.kind === "video") {
            const newTrack = (await navigator.mediaDevices.getUserMedia({ video: videoSettings.camera, audio: videoSettings.mic }))
              .getTracks()
              .filter(track => track.kind === "video")[0];
            const trackToRemove = mediaStreamRemote.current?.getTracks().filter(track => track.kind === "video")[0];
            mediaStreamRemote.current?.removeTrack(trackToRemove!);
            mediaStreamRemote.current?.addTrack(newTrack);
          }
        });
      }
    }
  }, [videoSettings]);

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
    if (socket.connected && peerId.length > 0 && mediaStreamLocal.current) {
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
