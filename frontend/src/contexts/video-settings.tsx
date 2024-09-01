import React, { createContext, useState } from "react";

export interface VideoSettings {
  mic: boolean;
  camera: boolean;
}

interface VideoSettingsContextType {
  videoSettings: VideoSettings;
  setVideoSettings: React.Dispatch<React.SetStateAction<VideoSettings>>;
}

const defaultSettings = { mic: true, camera: true };

export const VideoSettingsContext = createContext<VideoSettingsContextType | null>(null);

export default function VideoSettingsContextProvider({ children }: { children: React.ReactNode }) {

  const [videoSettings, setVideoSettings] = useState<VideoSettings>(defaultSettings);

  return (
    <VideoSettingsContext.Provider value={{ videoSettings, setVideoSettings }}>
      {children}
    </VideoSettingsContext.Provider>
  );

}
