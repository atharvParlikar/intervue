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

  socket.on("join-consent", ({ email, firstName, roomId, senderSocket }) => {
    console.log("enter permission");
    toast(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (t: any) => (
        <JoinConsent
          toastId={t.id}
          firstName={firstName}
          email={email}
          roomId={roomId}
          senderSocket={senderSocket}
        />
      ),
      {
        duration: 30000,
      },
    );
  });

  socket.on("join-consent-response", ({ allowed, roomId }) => {
    console.log("got response");
    console.log(allowed, roomId);
    if (allowed) {
      window.location.href = `/room/${roomId}`;
    }
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
