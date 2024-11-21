import { forwardRef, useImperativeHandle, useRef } from "react";
import {
  Mic,
  MicOff,
  VideocamOutlined,
  VideocamOffOutlined,
} from "@mui/icons-material";
import IconButton from "./ui/IconButton";
import "../App.css";
import { useStore } from "../contexts/zustandStore";

interface VideoRenderHandles {
  getLocalVideo: () => HTMLVideoElement | null;
  getRemoteVideo: () => HTMLVideoElement | null;
}

const VideoRender = forwardRef<{}, VideoRenderHandles>((_, ref) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const { videoSettings, updateVideoSettings } = useStore();

  useImperativeHandle(ref, () => ({
    getLocalVideo: () => localVideoRef.current,
    getRemoteVideo: () => remoteVideoRef.current,
  }));

  return (
    <div className="h-full drop-shadow-lg">
      <div className="relative group w-full h-full">
        <video
          ref={remoteVideoRef}
          className="w-full h-full object-cover videoElement"
          autoPlay
          muted
        />
        <video
          ref={localVideoRef}
          className="absolute bottom-4 right-4 w-1/4 h-1/4 object-cover rounded-md videoElement border-2 border-black"
          autoPlay
          muted
        />
        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center">
          <div className="flex space-x-4 mb-4">
            <IconButton
              backgroundColor={videoSettings.mic ? "#2b2d42" : "#ef233c"}
              Icon={videoSettings.mic ? Mic : MicOff}
              onClick={() =>
                updateVideoSettings({
                  ...videoSettings,
                  mic: !videoSettings.mic,
                })
              }
            />
            <IconButton
              backgroundColor={videoSettings.video ? "#2b2d42" : "#ef233c"}
              Icon={
                videoSettings.video ? VideocamOutlined : VideocamOffOutlined
              }
              onClick={() =>
                updateVideoSettings({
                  ...videoSettings,
                  video: !videoSettings.video,
                })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
});

export default VideoRender;
