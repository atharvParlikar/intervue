"use client";

import { useStore } from "@/contexts/store";
import { Button } from "./ui/button";
import { getSocket } from "@/lib/socketChannel";
import { X } from "lucide-react";
import toast from "react-hot-toast";

interface joinConsentProps {
  firstName: string;
  email: string;
  toastId: string;
  roomId: string;
  senderSocket: string;
}

export const JoinConsent = ({
  firstName,
  email,
  toastId,
  roomId,
  senderSocket,
}: joinConsentProps) => {
  const { wsReady } = useStore();

  const handleAllowed = () => {
    const socket = getSocket()!;
    socket.emit("join-consent-response", {
      allowed: true,
      email,
      firstName,
      roomId,
      senderSocket,
    });
    toast.dismiss(toastId);
  };

  const handleNotAllowed = () => {
    if (!useStore.getState().wsReady) return;

    const socket = getSocket()!;
    socket.emit("join-consent-response", {
      allowed: false,
      email,
      firstName,
      roomId,
      senderSocket,
    });
    toast.dismiss(toastId);
  };

  return (
    <div className="flex justify-between items-center gap-4">
      <X
        color="red"
        strokeWidth={4}
        onClick={handleNotAllowed}
        className="cursor-pointer hover:shadow-green-400/50"
      />
      <p>
        <span className="underline">{firstName}</span> wants to join the call
      </p>
      <Button
        className="hover:shadow-cyan-500/50"
        variant="toast"
        disabled={!wsReady}
        onClick={handleAllowed}
      >
        allow
      </Button>
    </div>
  );
};
