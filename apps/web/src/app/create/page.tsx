/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import VideoWithControlsLocal from "@/components/VideoWithControlsLocal";
import { useVideoStream } from "@/hooks/useVideoStream";

export default function Page() {
  const { videoRef, streamOn, stopTrack } = useVideoStream();
  const [isPrivate, setIsPrivate] = useState<boolean>(true);

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
      console.log("data: ", data);
      toast.success("room created successfully!");
      router.replace("/room/" + data.roomId);
    },
    onError: (error) => toast.error("ERROR: " + error.message),
  });

  const createRoom = () => {
    const roomId = generateRandomId();
    console.log("room isPrivate: ", isPrivate);
    createRoomMutation.mutate({ roomId, isPrivate });
  };

  return (
    <div className="flex justify-center h-screen items-center">
      <div className="flex flex-col gap-4 rounded-md">
        <h1 className="text-2xl mx-auto">
          笑って、あなたはカメラに映っています
        </h1>
        <VideoWithControlsLocal videoRef={videoRef} streamOn={streamOn} stopTrack={stopTrack} />
        <div className="flex justify-center mb-4">
          <Button onClick={createRoom}>Create</Button>
        </div>
        <div className="flex gap-2 justify-center items-center">
          <Checkbox
            checked={isPrivate}
            onCheckedChange={(checked: boolean) => setIsPrivate(checked)}
          />
          <Label>Make room private</Label>
        </div>
      </div>
    </div>
  );
}
