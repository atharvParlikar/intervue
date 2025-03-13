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
  editorState: string;
  setEditorState: (newCode: string) => void;
  videoSettings: VideoSettingsT;
  updateVideoSettings: (newVideoSettings: VideoSettingsT) => void;
  wsReady: boolean;
  setWsReady: (ready: boolean) => void;
  socketId: string | null;
  setSocketId: (socketId: string) => void;
  cameraOn: boolean;
  setCameraOn: (cameraOn: boolean) => void;
  micOn: boolean;
  setMicOn: (micOn: boolean) => void;
  remoteCameraOn: boolean;
  setRemoteCameraOn: (remoteCameraOn: boolean) => void;
  remoteMicOn: boolean;
  setRemoteMicOn: (remoteMicOn: boolean) => void;
  peerConnected: boolean;
  setPeerConnected: (peerConnected: boolean) => void;
  trackChange: TrackChangeT[];
  setTrackChange: (trackChange: TrackChangeT[]) => void;
  outputBuffer: string[];
  addOutput: (output: string) => void;
};

export const useStore = create<Store>((set) => ({
  editorState: "",
  setEditorState: (newCode) => set({ editorState: newCode }),
  videoSettings: { video: true, mic: true },
  updateVideoSettings: (newVideoSettings) =>
    set({ videoSettings: newVideoSettings }),
  wsReady: false,
  setWsReady: (ready) => set({ wsReady: ready }),
  socketId: null,
  setSocketId: (socketId) => set({ socketId }),
  cameraOn: localStorage.getItem("cameraOn") === "false" ? false : true,
  setCameraOn: (cameraOn) => {
    localStorage.setItem("cameraOn", cameraOn ? "true" : "false");
    set({ cameraOn });
  },
  micOn: localStorage.getItem("micOn") === "false" ? false : true,
  setMicOn: (micOn) => {
    localStorage.setItem("micOn", micOn ? "true" : "false");
    set({ micOn });
  },
  remoteCameraOn: false,
  setRemoteCameraOn: (remoteCameraOn) => set({ remoteCameraOn }),
  remoteMicOn: false,
  setRemoteMicOn: (remoteMicOn) => set({ remoteMicOn }),
  peerConnected: false,
  setPeerConnected: (peerConnected) => set({ peerConnected }),
  trackChange: [],
  setTrackChange: (trackChange) => set({ trackChange }),
  outputBuffer: [''],
  addOutput: (output) => set((state) => ({ outputBuffer: state.outputBuffer[0] !== '' ? [...state.outputBuffer, output] : [output] }))
}));
