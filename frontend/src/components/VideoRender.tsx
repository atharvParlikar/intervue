import { forwardRef, useContext, useImperativeHandle, useRef, useState } from 'react';
import { Mic, MicOff, VideocamOutlined, VideocamOffOutlined } from "@mui/icons-material";
import IconButton from './ui/IconButton';
import "../App.css"
import { VideoSettingsContext } from '../contexts/video-settings';

interface VideoRenderHandles {
  getLocalVideo: () => HTMLVideoElement | null;
  getRemoteVideo: () => HTMLVideoElement | null;
}

const VideoRender = forwardRef<{}, VideoRenderHandles>((_, ref) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [hideSelf, setHideSelf] = useState<boolean>(true);
  const { videoSettings, setVideoSettings } = useContext(VideoSettingsContext)!;

  useImperativeHandle(ref, () => ({
    getLocalVideo: () => localVideoRef.current,
    getRemoteVideo: () => remoteVideoRef.current,
  }));

  return (
    <div className="h-full drop-shadow-lg">
      {/* <div className={!hideSelf ? "hidden" : ""}> */}
      {/*   <video */}
      {/*     className="videoElement h-full" */}
      {/*     ref={localVideoRef} */}
      {/*     autoPlay */}
      {/*     muted */}
      {/*   /> */}
      {/* </div> */}
      {/* <video */}
      {/*   className="videoElement w-full rounded-lg object-cover" */}
      {/*   ref={remoteVideoRef} */}
      {/*   autoPlay */}
      {/*   muted */}
      {/* /> */}

      <div className="relative group w-full h-full bg-yellow-300">
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
              onClick={() => setVideoSettings(x => ({ ...x, mic: !x.mic }))}
            />
            <IconButton
              backgroundColor={videoSettings.video ? "#2b2d42" : "#ef233c"}
              Icon={videoSettings.video ? VideocamOutlined : VideocamOffOutlined}
              onClick={() => setVideoSettings(x => ({ ...x, video: !x.video }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

export default VideoRender;