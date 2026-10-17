"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { anchorRegistry } from "./anchors";
import { sceneUniforms } from "../uniforms";
import { useArchiveStore } from "../store";
import { presentMemories } from "../presentation";
import { archiveDirector } from "../director";

export const globalCameraRef: { current: THREE.Camera | null } = {
  current: null,
};
interface Thread {
  from: string;
  to: string;
  color: string;
  progress: number;
  intensity: number;
}

export function ThreadLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let frame = 0;
    let disposed = false;
    function render() {
      frame = 0;
      if (!canvas || !ctx || disposed || document.hidden) return;
      const width = window.innerWidth,
        height = window.innerHeight;
      const s = useArchiveStore.getState();
      const threads: Thread[] = [];
      const energy = sceneUniforms.basin.energy;
      ctx.clearRect(0, 0, width, height);
      if (s.isBusy || sceneUniforms.thread.castProgress > 0.01)
        threads.push({
          from: "question-seal",
          to: "pensieve-surface",
          color: "218,225,219",
          progress: sceneUniforms.thread.castProgress,
          intensity: 0.65,
        });
      if (energy > 0.18 && s.run)
        for (const node of presentMemories(s.run).filter((n) => n.selected)) {
          threads.push({
            from: "memory-" + node.id,
            to: "pensieve-surface",
            color: "221,184,118",
            progress: sceneUniforms.retrieval.returnThreadsProgress,
            intensity: Math.min(0.65, energy),
          });
        }
      const citation = s.activeCitationId ?? s.pinnedCitationId;
      if (citation && s.activeEvidence) {
        threads.push({
          from: "citation-" + citation,
          to: "pensieve-surface",
          color: "181,211,217",
          progress: sceneUniforms.thread.evidenceProgress,
          intensity: 0.55,
        });
        threads.push({
          from: "pensieve-surface",
          to: "evidence-source-leaf",
          color: "181,211,217",
          progress: sceneUniforms.thread.evidenceProgress,
          intensity: 0.5,
        });
      }
      for (const thread of threads) {
        const start = anchorRegistry.getScreenPos(
          thread.from,
          globalCameraRef.current,
          width,
          height,
        );
        const end = anchorRegistry.getScreenPos(
          thread.to,
          globalCameraRef.current,
          width,
          height,
        );
        if (!start || !end || !thread.progress) continue;
        const p = Math.min(1, thread.progress);
        const cx = (start.x + end.x) / 2,
          cy =
            Math.min(start.y, end.y) -
            Math.min(80, Math.abs(end.x - start.x) * 0.2);
        const ex =
          (1 - p) ** 2 * start.x + 2 * (1 - p) * p * cx + p ** 2 * end.x;
        const ey =
          (1 - p) ** 2 * start.y + 2 * (1 - p) * p * cy + p ** 2 * end.y;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.quadraticCurveTo(
          start.x + (cx - start.x) * p,
          start.y + (cy - start.y) * p,
          ex,
          ey,
        );
        ctx.strokeStyle = "rgba(" + thread.color + "," + thread.intensity + ")";
        ctx.lineWidth = 1.05;
        ctx.shadowColor = "rgb(" + thread.color + ")";
        ctx.shadowBlur = 7;
        ctx.stroke();
      }
      if (
        !s.reducedMotion &&
        !s.quietReading &&
        !s.lightMode &&
        archiveDirector.isAnimating()
      )
        frame = requestAnimationFrame(render);
    }
    function schedule() {
      if (!frame && !disposed && !document.hidden)
        frame = requestAnimationFrame(render);
    }
    function resize() {
      if (!canvas || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      schedule();
    }
    function visibility() {
      cancelAnimationFrame(frame);
      frame = 0;
      if (!document.hidden) schedule();
    }
    resize();
    const unsubscribe = useArchiveStore.subscribe(schedule);
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", schedule, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      unsubscribe();
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", schedule);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-40 h-dvh w-full"
      aria-hidden="true"
    />
  );
}
