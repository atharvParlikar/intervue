import { getSocket } from "@/lib/socketChannel";
import { useEffect, useRef, useState } from "react"
import SimplePeer, { SignalData } from "simple-peer"
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useStore } from "@/contexts/store";

export function VideoCallSimple() {
  const socket = getSocket();
  const { socketId } = useStore();
  const [peerSocketId, setPeerSocketId] = useState<string>('');
  const [initiator, setInitiator] = useState<boolean | null>(null);
  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const dataRef = useRef<SignalData | null>(null);

  useEffect(() => {
    if (!(socketId && initiator)) return;

    const peer = new SimplePeer({
      initiator: initiator!,
      trickle: false
    });

    peerRef.current = peer;

    peer.on("signal", (data) => {
      dataRef.current = data;
    });

    peer.on("connect", () => {
      console.log("peer connected");
    });
  }, [initiator, socketId]);


  useEffect(() => {
    if (!peerSocketId) return;

    socket?.on("signal", ({ signal }) => {
      console.log("Got: ", signal.type)
      if (!peerRef.current) {
        const peer = new SimplePeer({
          initiator: initiator!,
          trickle: false
        });

        peerRef.current = peer;

        peer.on("signal", (data) => {
          console.log("sending to: ", peerSocketId);
          socket.emit("signal", { signal: data, targetSocket: peerSocketId });
        });

        peer.on("connect", () => {
          console.log("peer connected");
        });
      }
      const peer = peerRef.current;

      console.log("Doing this");
      peer.signal(signal);
    });
  }, [peerSocketId])


  return (
    <div>
      {
        initiator !== null ?
          <div className="flex flex-col gap-6 items-center">
            <div onClick={() => navigator.clipboard.writeText(socket?.id!)} className="cursor-pointer text-green-500 drop-shadow-[0px_0px_13px_rgba(31,233,28,0.9)]">
              {socket?.id}
            </div>
            <Input value={peerSocketId} onChange={(e) => setPeerSocketId(e.target.value)} placeholder="peer-socket-id" />
            <Button onClick={() => {
              console.log(dataRef.current);
              socket?.emit("signal", {
                targetSocket: peerSocketId,
                signal: dataRef.current
              })
            }}>start</Button>
          </div>
          :
          <div className="flex gap-6">
            <Button onClick={() => setInitiator(true)}>Initiator</Button>
            <Button onClick={() => setInitiator(false)}>Not Initiator</Button>
          </div>
      }
    </div >
  );
}

// 1. get video stream
// 2. start a data channel
// 3. pass through stream
// 4. get remote stream
// 5. pass through a remoteVideoRef
// 6. set remoteVideoRef srcObject as remoteVideoStream
// 7. handle for remoteStream and addStream
