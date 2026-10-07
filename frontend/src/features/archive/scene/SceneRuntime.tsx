"use client";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useArchiveStore } from "../store";
import { archiveDirector } from "../director";

export function SceneRuntime() {
  const { invalidate } = useThree();
  const sample = useRef({ frames: 0, elapsed: 0 });
  const firstFrame = useRef(false);
  useEffect(() => useArchiveStore.subscribe(() => invalidate()), [invalidate]);
  useFrame((_, delta) => {
    const s = useArchiveStore.getState();
    if (!firstFrame.current) {
      firstFrame.current = true;
      requestAnimationFrame(() =>
        useArchiveStore.getState().markSceneMounted(),
      );
    }
    if (archiveDirector.isAnimating() && !s.reducedMotion && !s.quietReading)
      invalidate();
    if (s.reducedMotion || s.lightMode || s.quietReading || delta > 0.15)
      return;
    sample.current.frames++;
    sample.current.elapsed += delta;
    if (sample.current.frames < 120) return;
    const average = sample.current.elapsed / sample.current.frames;
    sample.current = { frames: 0, elapsed: 0 };
    if (average > 0.042 && s.qualityTier === "high") s.setQualityTier("mid");
    else if (average > 0.07 && s.qualityTier === "mid") s.setQualityTier("low");
  });
  return null;
}
