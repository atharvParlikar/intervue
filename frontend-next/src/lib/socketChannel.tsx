import { io, Socket } from "socket.io-client";
import { useStore } from "@/contexts/store";
import { toast } from "react-hot-toast";
import { JoinConsent } from "@/components/JoinConsentToast";

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

  socket.on("join-consent", ({ email, firstName, roomId }) => {
    console.log("enter permission");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toast((t: any) => (
      <JoinConsent
        toastId={t.id}
        firstName={firstName}
        email={email}
        roomId={roomId}
      />
    ));
  });

  socket.on("disconnect", () => {
    console.log("Socket connection closed!");
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socket.on("connect_error", (err: any) => {
    console.error("Error with socket connection:", err);
  });

  return socket;
};

export const getSocket = () => socket;
