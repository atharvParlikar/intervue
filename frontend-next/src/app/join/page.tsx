/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import VideoSelf from "@/components/VideoSelf";
import { useStore } from "@/contexts/store";
import { getSocket } from "@/lib/socketChannel";
import { useState } from "react";

export default function Page() {
  const { wsReady } = useStore();
  const [roomId, setRoomId] = useState("");

  // const joinRoomMutation = trpc.joinRoom.useMutation({
  //   onSuccess: (response) => {
  //     if (response) {
  //       toast.success(response.message);
  //       router.replace(`/room/${response.roomId}`);
  //     }
  //   },
  //   onError: (error) => {
  //     toast.error(error.message);
  //   },
  // });

  const joinRoom = () => {
    const socket = getSocket()!;
    socket.emit("joinRoom", {
      roomId,
      token: localStorage.getItem("token"),
    });
  };

  return (
    <div className="flex justify-center h-screen items-center">
      <div className="flex flex-col gap-4 rounded-md">
        <h1 className="text-2xl mx-auto">
          笑って、あなたはカメラに映っています
        </h1>

        <VideoSelf />

        <div className="flex gap-4 justify-center items-center h-14">
          <Input
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="w-1/2"
            placeholder="a1b2c3"
          />
          <Button disabled={!wsReady} onClick={joinRoom}>
            Join
          </Button>
        </div>
      </div>
    </div>
  );
}
