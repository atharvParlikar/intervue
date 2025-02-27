"use client";

import { useAuthToken } from "@/hooks/useAuthToken";
import { useSocketConnection } from "@/hooks/useSocketConnection";
import { useSocketMutation } from "@/hooks/useSocketMutation";
import { useParams } from "next/navigation";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { roomId } = useParams<{ roomId: string }>();
  useAuthToken();
  useSocketConnection();
  useSocketMutation({
    roomId,
  });

  // TODO: add a topbar or sidebar for account related things
  return <div className="h-screen w-screen">{children}</div>;
}
