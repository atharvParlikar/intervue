import { Skeleton } from "@/components/ui/skeleton";
import { usePathname } from "next/navigation";
import { useVideoStream } from "@/hooks/useVideoStream";
import { useEffect } from "react";

interface VideoComponentProps {
  width?: string;
  height?: string;
}

const VideoSelf = ({
  width = "640px",
  height = "480px",
}: VideoComponentProps) => {
  const { videoRef, cameraOn, stopTracks } = useVideoStream();
  const pathname = usePathname();

  useEffect(() => {
    return () => stopTracks();
  }, [pathname]);

  return (
    <>
      {cameraOn ? (
        <video
          ref={videoRef}
          className="localVideo rounded-md shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-shadow duration-300"
          autoPlay
          muted
          style={{ width, height }}
        />
      ) : (
        <Skeleton className="rounded-md" style={{ width, height }} />
      )}
    </>
  );
};

export default VideoSelf;
