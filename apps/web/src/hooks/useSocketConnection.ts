/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from "react";
import { useStore } from "@/contexts/store";
import { initializeSocket } from "@/lib/socketChannel";

const SOCKET_URL = "http://localhost:8000";

export function useSocketConnection() {
  const { setWsReady } = useStore();

  useEffect(() => {
    if (!useStore.getState().wsReady) {
      initializeSocket(SOCKET_URL);
      setWsReady(true);
    }
  }, []);
}
