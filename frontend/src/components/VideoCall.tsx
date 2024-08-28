import { useEffect, useRef, useState, useContext } from "react";
import Peer from 'peerjs'
import { Button } from "./ui/button";
import { socketContext } from "../socket";
import { useAuth } from "@clerk/clerk-react";

interface props {
  userType: string
};

function VideoCall({ userType }: props) {
  const [peerId, setPeerId] = useState('');
  const [remotePeerId, setRemotePeerId] = useState('');
  const [hideSelf, setHideSelf] = useState<boolean>(false);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerInstance = useRef<Peer | null>(null);
  const { getToken } = useAuth();

  const socket = useContext(socketContext);

  const call = (peerId: string) => {
    if (peerInstance.current) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((mediaStream) => {
          const call_ = peerInstance.current?.call(peerId, mediaStream);
          //  TODO: : handle case where call_ is undefined.
          call_?.on("stream", (remoteStream) => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
          })
        });
    }
  }


  useEffect(() => {
    const peer = new Peer();

    peer.on('open', (id) => {
      setPeerId(id);
    });

    peer.on('call', (call) => {
      console.log("got a call");
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((mediaStream: MediaStream) => {
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = mediaStream;
            call.answer(mediaStream);
            call.on("stream", (remoteStream) => {
              if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
              }
            });
          }
        })
    });

    peerInstance.current = peer;
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
      getToken({ template: "user" }).then(token => {
        socket.emit('connectionReady', JSON.stringify({
          token,
          peerId
        }));
      });
    }
  }, [peerId, socket]);

  return (
    <>
      <div className="flex h-full justify-center drop-shadow-lg">
        <div className={!hideSelf ? "hidden" : ""}>
          <video
            className="videoElement h-full"
            ref={localVideoRef}
            autoPlay
            muted
          />
        </div>
        <video
          className="videoElement w-full rounded-lg object-cover"
          ref={remoteVideoRef}
          autoPlay
          muted
        />
      </div>
    </>
  )
}

export default VideoCall;
