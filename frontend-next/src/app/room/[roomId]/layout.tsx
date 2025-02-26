"use client";

import { useSocketConnection } from "@/hooks/useSocketConnection";
import { useSocketMutation } from "@/hooks/useSocketMutation";

export default function Layout({ children }: { children: React.ReactNode }) {
  useSocketConnection();
  useSocketMutation();

  // TODO: add a topbar or sidebar for account related things
  return <div className="h-screen w-screen">{children}</div>;
}
