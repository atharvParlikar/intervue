/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useStore } from "@/contexts/store";
import { initializeSocket } from "@/lib/socketChannel";
import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { toast } from "react-hot-toast";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { setWsReady } = useStore();
  const SOCKET_URL = "http://localhost:8000";

  const { getToken } = useAuth();

  useEffect(() => {
    getToken({
      template: "user",
    }).then((token) => {
      if (token) {
        localStorage.setItem("token", token);
      } else
        toast.error(
          "error getting user token, try again or log out and log in",
        );
    });
  }, []);

  // const exitRoomMutation = trpc.exitRoom.useMutation();
  // const hasMounted = useRef(false);

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

  // TODO: add a topbar or sidebar for account related things
  return <div className="h-screen w-screen">{children}</div>;
}
