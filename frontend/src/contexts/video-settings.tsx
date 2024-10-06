import React, { createContext, useState } from "react";

export interface VideoSettings {
  mic: boolean;
  video: boolean;
}

interface VideoSettingsContextType {
  videoSettings: VideoSettings;
  setVideoSettings: React.Dispatch<React.SetStateAction<VideoSettings>>;
}

const defaultSettings = { mic: true, video: true };

export const VideoSettingsContext =
  createContext<VideoSettingsContextType | null>(null);

export default function VideoSettingsContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [videoSettings, setVideoSettings] =
    useState<VideoSettings>(defaultSettings);

  return (
    <VideoSettingsContext.Provider value={{ videoSettings, setVideoSettings }}>
      {children}
    </VideoSettingsContext.Provider>
  );
}
