'use client';

import Editor from "@/components/Editor";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useParams } from "next/navigation";

export default function Room() {
  const params = useParams<{ roomId: string }>();

  return (
    <div className="h-full w-full">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel className="bg-[#2C2F3F]" defaultSize={60}>
          <Editor roomId={params.roomId} />
        </ResizablePanel>
        <ResizableHandle withHandle className="w-fit" />
        <ResizablePanel defaultSize={40}>
          <ResizablePanelGroup direction="vertical" >
            <ResizablePanel className="bg-yellow-400" defaultSize={60}>
            </ResizablePanel>
            <ResizableHandle withHandle className="h-fit" />
            <ResizablePanel className="bg-orange-400" defaultSize={40}>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
