import "../App.css";
import { useContext, useEffect, useRef } from "react";
import { socketContext } from "../socket";
import { useUser } from "@clerk/clerk-react";
import { Button } from "./ui/button";

function WebRTCVideoCall() {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localConnection = useRef<RTCPeerConnection | null>(null);
  const remoteStream = new MediaStream();
  const dataChannel = useRef<RTCDataChannel | null>(null);
  const hideSelf = true;
  const socket = useContext(socketContext);
  const { user } = useUser(); // we know user is signed because we check it in its parent component

  const iceServers = {
    iceServers: [
      {
        urls: [
          "stun:stun1.l.google.com:19302",
          "stun:stun3.l.google.com:19302",
        ],
      },
    ],
  };

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: true })
      .then((stream: MediaStream) => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          stream.getTracks().forEach((track) => {
            console.log("track kind: ", track.kind);
            localConnection.current?.addTrack(track, stream);
          });
        }

        if (localConnection.current !== null) {
          localConnection.current.ontrack = (event) => {
            event.streams[0].getTracks().forEach((track) => {
              remoteStream.addTrack(track);
            });
          };
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        }
      });
    const localConnection_ = new RTCPeerConnection(iceServers);
    localConnection.current = localConnection_;
    const dataChannel_ = localConnection_.createDataChannel("channel");
    dataChannel_.onopen = () => {
      console.log("Connection open!");
    };
    dataChannel.current = dataChannel_;
    socket.emit("connectionReady", user?.primaryEmailAddress?.emailAddress);
  }, []);

  if (socket.connected) {
    console.log("Socket connected");

    // when you get offer from other peer
    socket.on("offer", async (offer: string) => {
      localConnection.current
        ?.setRemoteDescription(new RTCSessionDescription(JSON.parse(offer)))
        .then(async () => {
          const answer = await createAnswer();
          socket.emit(
            "answer",
            JSON.stringify({
              answer,
              email: user?.primaryEmailAddress?.emailAddress,
            }),
          );
        })
        .catch((err) => console.error(err));
    });

    // when you get answer from other peer
    socket.on("answer", (answer: string) => {
      console.log("Answer", answer);

      localConnection.current
        ?.setRemoteDescription(new RTCSessionDescription(JSON.parse(answer)))
        .then(() => console.log("Answer set successfully"))
        .catch((err) => console.error(err));
    });

    socket.on("connectionReady", () => {
      connect();
    });
  }

  const createOffer = () => {
    return new Promise((resolve) => {
      localConnection.current
        ?.createOffer()
        .then((offer) => {
          localConnection.current?.setLocalDescription(offer);
        })
        .then(() => console.log("offer set successfully!"));

      if (localConnection.current !== null) {
        localConnection.current.onicecandidate = (event) => {
          if (event.candidate === null) {
            console.log("Ice candidates discovered");
            resolve(localConnection.current?.localDescription);
          }
        };
      }
    });
  };

  const createAnswer = () => {
    console.log("Create answer called!!");
    return new Promise((resolve) => {
      localConnection.current
        ?.createAnswer()
        .then((answer) => {
          localConnection.current?.setLocalDescription(answer);
        })
        .then(() => console.log("answer set successfully"));

      if (localConnection.current !== null) {
        localConnection.current.onicecandidate = (event) => {
          if (event.candidate !== null) {
            resolve(localConnection.current?.localDescription);
          }
        };
      }
    });
  };

  const connect = async () => {
    const offer = await createOffer();
    console.log(localConnection.current?.connectionState);
    socket.emit(
      "offer",
      JSON.stringify({ offer, email: user?.primaryEmailAddress?.emailAddress }),
    );
  };

  return (
    <>
      <div className="flex h-full justify-center drop-shadow-lg">
        <div className={hideSelf ? "hidden" : ""}>
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
  );
}

export default WebRTCVideoCall;
