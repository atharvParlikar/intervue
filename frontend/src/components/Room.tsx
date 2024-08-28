import "../App.css";
import VideoCall from "./VideoCall";
import Editor from "./Editor";
import Output from "./Output";

import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';

import { useParams } from "react-router-dom";
import { SignedIn } from "@clerk/clerk-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Button } from "./ui/button";
import { useAuth } from "@clerk/clerk-react";
import { useContext, useEffect, useState, useRef } from "react";
import { socketContext } from "../socket";
import axios from "axios";

interface Sizes {
  width: number;
  height: number;
}

function Room() {
  const { roomId } = useParams();
  const { getToken } = useAuth();
  const socket = useContext(socketContext);
  const [renderVideo, setRenderVideo] = useState(false);
  const userType = useRef<string | null>(null)

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }
  }, [socket]);


  const setSocket = async () => {
    const res = await axios.post("http://localhost:3000/set-socket", {
      socketId: socket.id,
      token: await getToken({ template: "user" }),
      roomId_: roomId
    });

    if (res.status === 200) {
      userType.current = res.data.userType;
      setRenderVideo(true);
    }
  }

  useEffect(() => {
    socket.on("connect", () => {
      setSocket();

      socket.on("notify", (userObject: string, callback) => {
        console.log("notify called");
        const user = JSON.parse(userObject);
        notify(user, callback);
      });

    });

    return () => {
      socket.off("connect");
      socket.off("notify");
    }
  }, []);


  const notify = (user: {
    email: string;
    firstName: string;
  }, callback: any) =>
    toast(
      <div>
        <p className="mb-2">{user.email} is trying to join the meeting.</p>
        <Button
          onClick={() => {
            toast.dismiss();
            callback(true);
          }}
        >
          Allow
        </Button>
      </div>
    );

  const [sizes, setSizes] = useState<{ editor: Sizes; output: Sizes; video: Sizes }>({
    editor: { width: 0, height: 0 },
    output: { width: 0, height: 0 },
    video: { width: 0, height: 0 },
  });

  useEffect(() => {
    const totalWidth = window.innerWidth;
    const totalHeight = window.innerHeight;

    setSizes({
      editor: { width: totalWidth * 0.5, height: totalHeight },
      output: { width: totalWidth * 0.5, height: totalHeight * 0.5 },
      video: { width: totalWidth * 0.5, height: totalHeight * 0.5 },
    });

    const handleResize = () => {
      const newTotalWidth = window.innerWidth;
      const newTotalHeight = window.innerHeight;

      setSizes(_ => ({
        editor: { width: newTotalWidth * 0.5, height: newTotalHeight },
        output: { width: newTotalWidth * 0.5, height: newTotalHeight * 0.5 },
        video: { width: newTotalWidth * 0.5, height: newTotalHeight * 0.5 },
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleResize = (key: 'editor' | 'output' | 'video', newWidth: number, newHeight: number) => {
    const totalWidth = window.innerWidth;
    const totalHeight = window.innerHeight;

    if (key === 'editor') {
      const remainingWidth = totalWidth - newWidth;

      setSizes({
        editor: { width: newWidth, height: totalHeight },
        output: { width: remainingWidth, height: totalHeight * 0.5 },
        video: { width: remainingWidth, height: totalHeight * 0.5 },
      });
    } else {
      const otherHeight = totalHeight - newHeight;

      setSizes(prevSizes => ({
        ...prevSizes,
        [key]: { ...prevSizes[key], height: newHeight },
        output: key === 'output' ? { ...prevSizes.output, height: newHeight } : { ...prevSizes.output, height: otherHeight },
        video: key === 'video' ? { ...prevSizes.video, height: newHeight } : { ...prevSizes.video, height: otherHeight },
      }));
    }
  };

  return (
    <SignedIn>
      <div className="flex h-screen w-screen">
        <ResizableBox
          width={sizes.editor.width}
          height={sizes.editor.height}
          minConstraints={[100, 100]}
          maxConstraints={[sizes.editor.width + sizes.output.width, sizes.editor.height]}
          onResizeStop={(_, { size }) => handleResize('editor', size.width, size.height)}
          className="border box-border overflow-auto rounded-md bg-gray-100 h-full"
        >
          <div>{socket.id}</div>
          <Editor />
        </ResizableBox>
        <div className="flex flex-col flex-1">
          <ResizableBox
            width={sizes.output.width}
            height={sizes.output.height}
            minConstraints={[100, 100]}
            maxConstraints={[sizes.output.width, sizes.output.height + sizes.video.height]}
            onResizeStop={(_, { size }) => handleResize('output', size.width, size.height)}
            className="border box-border overflow-auto rounded-md bg-blue-300"
          >
            <Output />
          </ResizableBox>
          <ResizableBox
            width={sizes.video.width}
            height={sizes.video.height}
            minConstraints={[100, 100]}
            maxConstraints={[sizes.video.width, sizes.output.height + sizes.video.height]}
            onResizeStop={(_, { size }) => handleResize('video', size.width, size.height)}
            className="border box-border overflow-auto rounded-md bg-green-300"
          >
            {renderVideo && userType.current && (
              <VideoCall userType={userType.current} />
            )}
          </ResizableBox>
        </div>
      </div>

      <ToastContainer />
    </SignedIn>
  );
}

export default Room;
