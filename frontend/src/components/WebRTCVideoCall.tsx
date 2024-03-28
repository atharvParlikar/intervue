// TODO:
// Look at why the fuck is dataChannel not open even tho
// video is getting streamed pretty well.

// NOTES:
// ideal: (create offer -> set local -> set remote -> create answer -> set local -> set remote)
// mine: ()

import "../App.css";
import { useContext, useEffect, useRef, useState } from "react";
import { socketContext } from "../socket";

function WebRTCVideoCall() {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localConnection = useRef<RTCPeerConnection | null>(null);
  const remoteStream = new MediaStream();
  const dataChannel = useRef<RTCDataChannel | null>(null);
  const [hideSelf, setHideSelf] = useState(true);
  const socket = useContext(socketContext);

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
          connect();
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

    if (!isConnected) {
      socket.connect();
      setIsConnected(true);
      socket.emit("room", "1");
    }
  }, []);

  socket.on("connect", () => {
    console.log("Socket connected");

    // when you get offer from other peer
    socket.on("offer", async (offer: string) => {
      localConnection.current
        ?.setRemoteDescription(new RTCSessionDescription(JSON.parse(offer)))
        .then(async () => {
          const answer = await createAnswer();
          socket.emit("answer", JSON.stringify(answer));
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
  });

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
    socket.emit("offer", JSON.stringify(offer));
  };

  return (
    <>
      <div className="flex h-full justify-center">
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
