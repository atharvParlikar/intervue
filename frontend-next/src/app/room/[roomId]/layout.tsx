/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { useStore } from "@/contexts/store";
import { initializeSocket } from "@/lib/socketChannel";
import { useEffect } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { wsReady, setWsReady } = useStore();
  const SOCKET_URL = "http://localhost:8000";

  useEffect(() => {
    if (!wsReady) {
      initializeSocket(SOCKET_URL);
      setWsReady(true);
    }
  }, []);


  // TODO: add a topbar or sidebar for account related things
  return (
    <div className="h-screen w-screen">
      {children}
    </div>
  );
}
