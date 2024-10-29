import { useEffect, useRef, useState, useContext, useCallback } from "react";
import Peer, { MediaConnection } from "peerjs";
import { socketContext } from "../socket";
import VideoRender from "./VideoRender";
import { VideoSettingsContext } from "../contexts/video-settings";

interface Props {
  userType: string;
}

interface VideoRenderHandles {
  getLocalVideo: () => HTMLVideoElement | null;
  getRemoteVideo: () => HTMLVideoElement | null;
}

function VideoCall({ userType }: Props) {
  const [peerId, setPeerId] = useState("");
  const [remotePeerId, setRemotePeerId] = useState("");
  const peerInstance = useRef<Peer | null>(null);
  const connectionRef = useRef<MediaConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const token = localStorage.getItem("token");

  const socket = useContext(socketContext);
  const { videoSettings } = useContext(VideoSettingsContext)!;

  const videoRenderRef = useRef<VideoRenderHandles | null>(null);

  // resets the shit out of the stream
  const createStream = useCallback(async () => {
    console.log("Creating stream");
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoSettings.video,
        audio: videoSettings.mic,
      });

      localStream.current = stream;
      const localVideo = videoRenderRef.current?.getLocalVideo();
      if (localVideo) {
        localVideo.srcObject = stream;
      }

      return stream;
    } catch (error) {
      console.error("Error creating media stream:", error);
      return null;
    }
  }, []);

  const call = useCallback(
    async (remotePeerId: string) => {
      if (!peerInstance.current) {
        console.error("Peer instance not initialized");
        return;
      }

      try {
        const stream = await createStream();
        if (!stream) {
          console.error("Failed to create local stream");
          return;
        }

        const call = peerInstance.current.call(remotePeerId, stream);
        connectionRef.current = call;

        call.on("stream", (incomingStream) => {
          // remoteStream.current = incomingStream;
          const remoteVideo = videoRenderRef.current?.getRemoteVideo();
          if (remoteVideo) {
            remoteVideo.srcObject = incomingStream;
          }
        });

        call.on("error", (error) => {
          console.error("Call error:", error);
        });

        call.on("close", () => {
          console.log("Call closed");
          // Handle call closure (clean up UI)
        });
      } catch (error) {
        console.error("Error initiating call:", error);
      }
    },
    [createStream],
  );

  useEffect(() => {
    const peer = new Peer();
    peerInstance.current = peer;

    peer.on("open", (id) => {
      console.log("Peer opened with ID:", id);
      setPeerId(id);
    });

    peer.on("error", (error) => {
      console.error("Peer error:", error);
    });

    peer.on("call", async (incomingCall) => {
      console.log("Received incoming call");
      try {
        const stream = await createStream();
        if (!stream) {
          console.error("Failed to create local stream for incoming call");
          return;
        }

        incomingCall.answer(stream);
        connectionRef.current = incomingCall;

        incomingCall.on("stream", (incomingStream) => {
          remoteStream.current = incomingStream;
          const remoteVideo = videoRenderRef.current?.getRemoteVideo();
          if (remoteVideo) {
            remoteVideo.srcObject = incomingStream;
          }
        });

        incomingCall.on("error", (error) => {
          console.error("Incoming call error:", error);
        });

        incomingCall.on("close", () => {
          console.log("Incoming call closed");
          // Handle call closure (e.g., clean up UI)
        });
      } catch (error) {
        console.error("Error handling incoming call:", error);
      }
    });

    return () => {
      if (connectionRef.current) {
        connectionRef.current.close();
      }
      peer.destroy();
    };
  }, [createStream]);

  useEffect(() => {
    const updateStream = async () => {
      if (videoSettings.video || videoSettings.mic) {
        const newStream = await createStream();
        if (!newStream) return;

        if (connectionRef.current) {
          const pc = connectionRef.current.peerConnection;
          const senders = pc.getSenders();

          senders.forEach((sender) => {
            pc.removeTrack(sender);
          });

          if (videoSettings.video) {
            const videoTrack = newStream.getVideoTracks()[0];
            pc.addTrack(videoTrack);
          }

          if (videoSettings.mic) {
            const audioTrack = newStream.getAudioTracks()[0];
            pc.addTrack(audioTrack);
          }
        }
      } else {
        console.log("Stopping all tracks");
        localStream.current?.getTracks().forEach((track) => track.stop());
        const localVideo = videoRenderRef.current?.getLocalVideo();
        if (localVideo) {
          localVideo.srcObject = null;
        }
      }
    };

    // updateStream();
    const updateStreamNew = async () => {
      console.log("updateStream called");
      if (!videoSettings.video) {
        localStream.current?.getTracks().forEach((track) => {
          console.log("This is a track: ", track.kind);
          if (track.kind === "video") {
            console.log("This is a video track");
            track.stop();
          }
        });
        if (connectionRef.current) {
          connectionRef.current.peerConnection
            .getSenders()
            .forEach((sender) => {
              if (sender.track?.kind === "video") {
                connectionRef.current?.peerConnection.removeTrack(sender);
              }
            });
        }
      } else {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: videoSettings.mic,
        });

        localStream.current = newStream;

        const localVideo = videoRenderRef.current?.getLocalVideo();
        if (localVideo) {
          localVideo.srcObject = newStream;
        }

        if (!newStream) return;

        console.log("connectionRef: ", connectionRef.current);

        if (connectionRef.current) {
          const pc = connectionRef.current.peerConnection;
          const videoTrack = newStream.getVideoTracks()[0];
          pc.addTrack(videoTrack);
        }
      }
    };

    updateStreamNew();
  }, [videoSettings.video]);

  useEffect(() => {
    if (socket.connected) {
      const handleConnectionReady = (incomingPeerId: string) => {
        console.log("Received connectionReady with peerId:", incomingPeerId);
        setRemotePeerId(incomingPeerId);
        call(incomingPeerId);
      };

      socket.on("connectionReady", handleConnectionReady);

      return () => {
        socket.off("connectionReady", handleConnectionReady);
      };
    }
  }, [socket, call]);

  useEffect(() => {
    if (socket.connected && peerId) {
      console.log("Sending connectionReady with peerId:", peerId);
      socket.emit("connectionReady", JSON.stringify({ token, peerId }));
    }
  }, [peerId, socket, token]);

  return (
    <div>
      <button
        onClick={async () => {
          console.log(connectionRef.current?.peerConnection.getSenders());
        }}
      >
        DEBUG
      </button>
      <VideoRender ref={videoRenderRef} />
    </div>
  );
}

export default VideoCall;
