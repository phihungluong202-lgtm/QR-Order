"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Kitchen sound notification hook using Web Audio API.
 *
 * Handles browser autoplay policy: AudioContext is created lazily and only
 * resumes after a user gesture. Preference is persisted to localStorage.
 */
export function useKitchenSound() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("kitchen-sound-enabled") !== "false";
  });

  /** true if the browser has blocked autoplay (needs a user tap to unlock) */
  const [blocked, setBlocked] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("kitchen-sound-enabled", String(enabled));
    }
  }, [enabled]);

  const getCtx = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    try {
      if (!ctxRef.current || ctxRef.current.state === "closed") {
        ctxRef.current = new AudioContext();
      }
      return ctxRef.current;
    } catch {
      return null;
    }
  }, []);

  /** Call this on any user interaction to unlock AudioContext */
  const unlock = useCallback(() => {
    const ctx = getCtx();
    if (ctx?.state === "suspended") {
      ctx.resume().then(() => setBlocked(false)).catch(() => {});
    } else {
      setBlocked(false);
    }
  }, [getCtx]);

  const play = useCallback(() => {
    if (!enabled) return;

    const ctx = getCtx();
    if (!ctx) return;

    const doPlay = () => {
      const now = ctx.currentTime;

      // Two rising tones — classic kitchen bell feel
      [
        { freq: 660, delay: 0.0 },
        { freq: 880, delay: 0.18 },
        { freq: 660, delay: 0.36 },
      ].forEach(({ freq, delay }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = "sine";
        osc.frequency.value = freq;

        const t = now + delay;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.35, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

        osc.start(t);
        osc.stop(t + 0.16);
      });
    };

    if (ctx.state === "suspended") {
      setBlocked(true);
      ctx.resume().then(() => { setBlocked(false); doPlay(); }).catch(() => {});
    } else {
      doPlay();
    }
  }, [enabled, getCtx]);

  const toggle = useCallback(() => setEnabled((v) => !v), []);

  return { enabled, toggle, play, unlock, blocked };
}
