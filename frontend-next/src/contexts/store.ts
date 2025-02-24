import { create } from "zustand";

export type VideoSettingsT = {
  video: boolean;
  mic: boolean;
};

type Store = {
  code: string;
  updateCode: (newCode: string) => void;
  videoSettings: VideoSettingsT;
  updateVideoSettings: (newVideoSettings: VideoSettingsT) => void;
  wsReady: boolean;
  setWsReady: (ready: boolean) => void;
  socketId: string | null;
  setSocketId: (socketId: string) => void;
};

export const useStore = create<Store>((set) => ({
  code: "",
  updateCode: (newCode) => set({ code: newCode }),
  videoSettings: { video: true, mic: true },
  updateVideoSettings: (newVideoSettings) =>
    set({ videoSettings: newVideoSettings }),
  wsReady: false,
  setWsReady: (ready) => set({ wsReady: ready }),
  socketId: null,
  setSocketId: (socketId) => set({ socketId }),
}));
