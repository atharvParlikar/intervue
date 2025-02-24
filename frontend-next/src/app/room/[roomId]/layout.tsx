/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useStore } from "@/contexts/store";
import { initializeSocket } from "@/lib/socketChannel";
import { trpc } from "@/lib/trpc";
import { useEffect } from "react";
import { toast } from "react-hot-toast";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { socketId, setWsReady } = useStore();
  const SOCKET_URL = "http://localhost:8000";

  // const exitRoomMutation = trpc.exitRoom.useMutation();
  // const hasMounted = useRef(false);
  const setSocketMutation = trpc.setSocket.useMutation({
    onSuccess: (res) => toast.success(res.message),
    onError: (err) => toast.error(err.message),
  });

  // useEffect(() => {
  //   // skip first unmount cause by react strict mode (in dev mode only)
  //   if (process.env.NODE_ENV === "development") {
  //     if (!hasMounted.current) {
  //       hasMounted.current = true;
  //       return;
  //     }
  //   }

  //   return () => exitRoomMutation.mutate();
  // }, []);

  useEffect(() => {
    if (!useStore.getState().wsReady) {
      initializeSocket(SOCKET_URL);
      setWsReady(true);
    }
  }, []);

  useEffect(() => {
    if (socketId) {
      setSocketMutation.mutate({ socketId });
    }
  }, [socketId]);

  // TODO: add a topbar or sidebar for account related things
  return <div className="h-screen w-screen">{children}</div>;
}
