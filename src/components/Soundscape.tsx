"use client";
import { useEffect } from "react";
import { audio, type MusicState } from "@/game/audio/engine";
import { useSettings } from "@/state/settings";
export default function Soundscape({ state }: { state: MusicState }) {
  useEffect(() => {
    const unmount = audio.mount();
    audio.configure(useSettings.getState());
    const unsubscribe = useSettings.subscribe((p) => {
      audio.configure(p);
      document.documentElement.dataset.reducedMotion = String(p.reducedEffects);
      document.documentElement.dataset.quality = p.quality;
    });
    const p = useSettings.getState();
    document.documentElement.dataset.reducedMotion = String(p.reducedEffects);
    document.documentElement.dataset.quality = p.quality;
    if (process.env.NEXT_PUBLIC_E2E === "1") window.__NOWRIFT_AUDIO__ = audio;
    return () => {
      unmount();
      unsubscribe();
      delete window.__NOWRIFT_AUDIO__;
    };
  }, []);
  useEffect(() => {
    audio.setScene(state);
  }, [state]);
  return null;
}
declare global {
  interface Window {
    __NOWRIFT_AUDIO__?: typeof audio;
  }
}
