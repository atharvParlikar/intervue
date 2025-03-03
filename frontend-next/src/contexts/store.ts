import { create } from "zustand";

export type VideoSettingsT = {
  video: boolean;
  mic: boolean;
};

export type TrackChangeT = {
  changeType: "added" | "removed";
  track: MediaStreamTrack;
  kind: "audio" | "video";
}

type Store = {
  code: string;
  updateCode: (newCode: string) => void;
  videoSettings: VideoSettingsT;
  updateVideoSettings: (newVideoSettings: VideoSettingsT) => void;
  wsReady: boolean;
  setWsReady: (ready: boolean) => void;
  socketId: string | null;
  setSocketId: (socketId: string) => void;
  peerSocketId: string | null;
  setPeerSocketId: (peerSocketId: string) => void;
  cameraOn: boolean;
  setCameraOn: (cameraOn: boolean) => void;
  micOn: boolean;
  setMicOn: (micOn: boolean) => void;
  trackChange: TrackChangeT[];
  setTrackChange: (trackChange: TrackChangeT[]) => void;
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
  peerSocketId: null,
  setPeerSocketId: (peerSocketId) => set({ peerSocketId }),
  cameraOn: true,
  setCameraOn: (cameraOn) => set({ cameraOn }),
  micOn: true,
  setMicOn: (micOn) => set({ micOn }),
  trackChange: [],
  setTrackChange: (trackChange) => set({ trackChange })
}));
