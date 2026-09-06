"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface MediaChoices {
  cameraId: string;
  microphoneId: string;
  speakerId: string;
  cameraEnabled: boolean;
  microphoneEnabled: boolean;

  backgroundBlur: boolean;
}

export type PermissionState = "pending" | "granted" | "denied";

const STORAGE_KEY = "us-stream-devices";

function readStoredChoices(): Partial<MediaChoices> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<MediaChoices>;
  } catch {
    return {};
  }
}

function storeChoices(choices: MediaChoices) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(choices));
  } catch {}
}

export function useMediaPreview() {
  const [permission, setPermission] = useState<PermissionState>("pending");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [choices, setChoices] = useState<MediaChoices>({
    cameraId: "",
    microphoneId: "",
    speakerId: "",
    cameraEnabled: true,
    microphoneEnabled: true,
    backgroundBlur: false,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setChoices((current) => ({ ...current, ...readStoredChoices() }));
  }, []);

  const release = useCallback(() => {
    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop();
    }
    streamRef.current = null;
    setStream(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function open() {
      release();

      if (!choices.cameraEnabled && !choices.microphoneEnabled) {
        setPermission("granted");
        return;
      }

      try {
        const opened = await navigator.mediaDevices.getUserMedia({
          video: choices.cameraEnabled
            ? { deviceId: choices.cameraId ? { exact: choices.cameraId } : undefined }
            : false,
          audio: choices.microphoneEnabled
            ? { deviceId: choices.microphoneId ? { exact: choices.microphoneId } : undefined }
            : false,
        });

        if (cancelled) {
          for (const track of opened.getTracks()) {
            track.stop();
          }
          return;
        }

        streamRef.current = opened;
        setStream(opened);
        setPermission("granted");

        if (videoRef.current) {
          videoRef.current.srcObject = opened;
        }

        setDevices(await navigator.mediaDevices.enumerateDevices());
      } catch {
        if (!cancelled) {
          setPermission("denied");
        }
      }
    }

    void open();

    return () => {
      cancelled = true;
    };
  }, [
    choices.cameraEnabled,
    choices.cameraId,
    choices.microphoneEnabled,
    choices.microphoneId,
    release,
  ]);

  useEffect(() => release, [release]);

  useEffect(() => {
    const audioTrack = stream?.getAudioTracks()[0];

    if (!audioTrack) {
      setAudioLevel(0);
      return;
    }

    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    context.createMediaStreamSource(new MediaStream([audioTrack])).connect(analyser);

    const samples = new Uint8Array(analyser.frequencyBinCount);
    let frame = 0;

    const tick = () => {
      analyser.getByteTimeDomainData(samples);

      let peak = 0;
      for (const sample of samples) {
        peak = Math.max(peak, Math.abs(sample - 128) / 128);
      }

      setAudioLevel(peak);
      frame = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(frame);
      void context.close();
    };
  }, [stream]);

  const update = useCallback((patch: Partial<MediaChoices>) => {
    setChoices((current) => {
      const next = { ...current, ...patch };
      storeChoices(next);
      return next;
    });
  }, []);

  return {
    permission,
    choices,
    update,
    audioLevel,
    videoRef,
    cameras: devices.filter((device) => device.kind === "videoinput"),
    microphones: devices.filter((device) => device.kind === "audioinput"),
    speakers: devices.filter((device) => device.kind === "audiooutput"),

    release,
  };
}
