"use client";

import Editor from "@/components/Editor";
import { Output } from "@/components/Output";
import { TopBar } from "@/components/TopBar";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { VideoCall } from "@/components/VideoCall";
import { trpc } from "@/lib/trpc";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "react-hot-toast";

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const checkRoomLiveQuery = trpc.checkRoomLive.useQuery({
    roomId: roomId,
  });
  const checkUserExistsQuery = trpc.checkUserExists.useQuery({
    roomId: roomId,
  });

  // to check if room exists
  useEffect(() => {
    if (checkRoomLiveQuery.data) {
      if (!checkRoomLiveQuery.data.isLive) {
        toast.error("room does not exits");
        router.replace("/join");
      }
    }
  }, [checkRoomLiveQuery.data, router]);

  // to check if user is in the room
  useEffect(() => {
    if (checkUserExistsQuery.data) {
      if (!checkUserExistsQuery.data.isInRoom) {
        toast.error("user is not in room");
        router.replace("/join");
      }
    }
  }, [checkUserExistsQuery.data, router]);

  if (checkRoomLiveQuery.isLoading) return <div>Loading...</div>;
  if (checkRoomLiveQuery.error)
    return <div>{checkRoomLiveQuery.error.message}</div>;
  if (!checkRoomLiveQuery.data?.isLive) {
    console.log("checkRoomLive: ", checkRoomLiveQuery.data);
    return <div>room does not exits</div>;
  }

  return (
    <div className="h-full w-full flex flex-col">
      <TopBar />
      <div className="flex-1">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel className="bg-[#2C2F3F]" defaultSize={60}>
            <Editor roomId={roomId} />
          </ResizablePanel>
          <ResizableHandle withHandle className="w-fit" />
          <ResizablePanel defaultSize={40}>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel
                defaultSize={60}
              >
                <Output roomId={roomId} />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={40}>
                <VideoCall />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
