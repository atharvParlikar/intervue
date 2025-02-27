import { usePathname } from "next/navigation";
import { useVideoStream } from "@/hooks/useVideoStream";
import { useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Mic } from "lucide-react";

export function VideoCall() {
  const { videoRef, stopTracks } = useVideoStream();
  const parentRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    return () => stopTracks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div className="bg-blue-400 h-full w-full" ref={parentRef}>
      <video ref={videoRef} className="localVideo" autoPlay muted />
      <div className="flex">
        <Button className="rounded-full">
          <Mic />
        </Button>
      </div>
    </div>
  );
}
