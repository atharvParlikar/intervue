/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from "react";
import { useStore } from "@/contexts/store";
import { initializeSocket } from "@/lib/socketChannel";

const SOCKET_URL = process.env.NEXT_PUBLIC_SERVER_URL;

export function useSocketConnection() {
  const { setWsReady } = useStore();

  useEffect(() => {
    if (!useStore.getState().wsReady) {
      initializeSocket(SOCKET_URL!);
      setWsReady(true);
    }
  }, []);
}
