import { Dispatch, SetStateAction, createContext } from "react";
import { io } from "socket.io-client";

export const socket = io("http://localhost:3000", {
  autoConnect: false,
});

export const socketContext = createContext(socket);

export const connectedContext =
  createContext<[boolean, Dispatch<SetStateAction<boolean>>]>();
