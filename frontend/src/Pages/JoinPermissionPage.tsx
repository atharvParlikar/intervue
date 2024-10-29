import { Button } from "../components/ui/button";
import { ToastContainer } from "react-toastify";
import "../App.css";
import { SignedIn } from "@clerk/clerk-react";
import { NavigateNext } from "@mui/icons-material";
import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { trpc } from "../client";
// import Room from "./Room";
// import TestingPage from "./TestingPage";
import Room from "./Room";

function JoinPermissionPage() {
  const { roomId } = useParams();
  const [renderJoinRoom, setRenderJoinRoom] = useState(true);
  const [isRenderResolved, setIsRenderResolved] = useState(false);
  const [isRoomLive, setIsRoomLive] = useState(true);
  const [isRoomLiveResolved, setIsRoomLiveResolved] = useState(false);
  const localVideoStream = useRef<MediaStream | null>(null);
  const localVideo = useRef<HTMLVideoElement | null>(null);
  const joinRoomMutation = trpc.joinRoom.useMutation({
    onSuccess: () => {
      console.log("Joined room");
      setRenderJoinRoom(false);
    },
  });

  const verificationRes = trpc.renderJoinpage.useQuery(
    { roomId: roomId! },
    {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      staleTime: Infinity, // Consider the data fresh indefinitely
    },
  );

  const roomLiveRes = trpc.checkRoomLive.useQuery({ roomId: roomId! });

  useEffect(() => {
    if (!verificationRes.isLoading) {
      if (verificationRes.isError) {
        console.error(": ", verificationRes.error);
      } else {
        console.log(verificationRes.data);
        setRenderJoinRoom(verificationRes.data?.renderJoinPage);
        setIsRenderResolved(true);
      }
    }
  }, [verificationRes.isLoading]);

  useEffect(() => {
    if (!roomLiveRes.isLoading) {
      if (roomLiveRes.isError) {
        console.error(": ", roomLiveRes.error);
      } else {
        console.log(roomLiveRes.data);
        setIsRoomLive(roomLiveRes.data?.isLive);
        setIsRoomLiveResolved(true);
      }
    }
  }, [roomLiveRes.isLoading]);

  useEffect(() => {
    (async () => {
      if (localVideo.current) {
        localVideoStream.current = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localVideo.current.srcObject = localVideoStream.current;
      }
    })();

    return () => {
      if (localVideoStream.current) {
        localVideoStream.current.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, []);

  const JoinPageComponent = () => (
    <div className="flex h-screen w-screen items-center justify-center ">
      <div>
        <h1 className="font-thin text-3xl">Say hi to the camera ✨</h1>
        <video ref={localVideo}></video>
        <div className="mt-2 flex">
          <div className="flex w-full max-w-sm items-center space-x-2">
            <Button
              onClick={() => {
                joinRoomMutation.mutate({ roomId: roomId! });
              }}
              className="px-4 py-8 bg-darkslategray"
            >
              <NavigateNext />
              Join Room
            </Button>
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );

  return (
    <SignedIn>
      {isRenderResolved && isRoomLiveResolved ? (
        isRoomLive ? (
          renderJoinRoom ? (
            <JoinPageComponent />
          ) : (
            <div>
              <Room setIsRoomLive={setIsRoomLive} />
              {/* <TestingPage /> */}
            </div>
          )
        ) : (
          <div>Room does not exist</div>
        )
      ) : (
        <div>Loading...</div>
      )}
    </SignedIn>
  );
}

export default JoinPermissionPage;
