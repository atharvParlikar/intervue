import { io, Socket } from "socket.io-client";
import { useStore } from "@/contexts/store";

let socket: Socket | null;

export const initializeSocket = (URL: string) => {
  socket = io(URL);

  socket.on("connect", () => {
    console.log("Socket connection open!");
    useStore.getState().setWsReady(true);
    if (socket && socket.id) {
      useStore.getState().setSocketId(socket.id);
    }
  });

  // client[join] -(roomId, ctx)-> server[joinRequest] -(name, email)-> host[joinResponse] -(response: boolean)-> server -> ...

  socket.on("disconnect", () => {
    console.log("Socket connection closed!");
  });

  socket.on("connect_error", (err: any) => {
    console.error("Error with socket connection:", err);
  });

  return socket;
};

export const getSocket = () => socket;
