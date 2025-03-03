"use client";

import { VideoCallSimple } from "@/components/VideoCallSimple";
import { useStore } from "@/contexts/store";

export default function Page() {
  const { socketId } = useStore();

  return (
    <div className="h-screen w-screen flex justify-center items-center">
      {
        !!socketId && <VideoCallSimple />
      }
    </div>
  );
}
