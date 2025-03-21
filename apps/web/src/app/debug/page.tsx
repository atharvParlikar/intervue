"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export default function Page() {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recording, setRecording] = useState<boolean>(false);
  const [audioDevices, setAudioDevices] = useState<string[]>([]);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      setAudioDevices(devices.filter(device => device.kind === "audioinput").map(deviceInfo => deviceInfo.label));
    })

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      const recorder = new MediaRecorder(stream);
      let audioChunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      };

      setMediaRecorder(recorder);
    });
  }, []);

  const startRecording = () => {
    setRecording(true);
    if (mediaRecorder) {
      mediaRecorder.start();
    }
  };

  const stopRecording = () => {
    setRecording(false);
    if (mediaRecorder) {
      mediaRecorder.stop();
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col justify-center items-center gap-4">
      {recording ? "Recording..." : (<ul>
        {audioDevices.map((device, index) => <li key={index}>{device}</li>)}
      </ul>)}
      <Button onClick={startRecording} variant="default">
        Start Recording
      </Button>
      <Button onClick={stopRecording} variant="destructive">
        Stop Recording
      </Button>
      {audioUrl && (
        <audio controls className="mt-4">
          <source src={audioUrl} type="audio/webm" />
          Your browser does not support the audio element.
        </audio>
      )}
    </div>
  );
}
