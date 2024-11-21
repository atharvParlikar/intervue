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
};

export const useStore = create<Store>((set) => ({
  code: "",
  updateCode: (newCode: string) => set({ code: newCode }),
  videoSettings: { video: true, mic: true },
  updateVideoSettings: (newVideoSettings: VideoSettingsT) =>
    set({ videoSettings: newVideoSettings }),
}));
