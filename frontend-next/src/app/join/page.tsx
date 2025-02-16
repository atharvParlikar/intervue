/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

export default function Page() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoStream = useRef<MediaStream | null>(null);

  const router = useRouter();

  const generateRandomId = (): string => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let id = "";
    for (let i = 0; i < 4; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  };

  const createRoomMutation = trpc.createRoom.useMutation({
    onSuccess: (data) => {
      toast.success("room created successfully!")
      router.replace("/room/" + data.roomId)
    },
    onError: (error) => toast.error("ERROR: " + error.message),
  });

  const createRoom = () => {
    const roomId = generateRandomId();
    createRoomMutation.mutate({ roomId });
  }

  useEffect(() => {
    const setupStreams = async () => {
      if (videoRef.current) {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        videoStream.current = mediaStream;
        videoRef.current.srcObject = mediaStream;
      }
    }
    setupStreams();

    return () => {
      videoStream.current?.getTracks().forEach((track) => {
        track.stop();
      })
    }
  }, [videoRef.current])

  return (
    <div className="flex justify-center h-screen items-center">
      <div className="flex flex-col gap-4 rounded-md">
        <h1 className="text-2xl mx-auto">笑って、あなたはカメラに映っています</h1>
        <div>
          <video className="localVideo" autoPlay muted ref={videoRef} />
        </div>
        <div className="flex gap-4 justify-center">
          <Button>Join</Button>
          <Button onClick={createRoom}>Create</Button>
        </div>
      </div>
    </div>
  )
}
