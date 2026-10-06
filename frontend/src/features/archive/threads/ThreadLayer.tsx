"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { anchorRegistry } from "./anchors";
import { sceneUniforms } from "../uniforms";
import { useArchiveStore } from "../store";

export const globalCameraRef: { current: THREE.Camera | null } = { current: null };

interface ActiveThread {
  id: string;
  fromId: string;
  toId: string;
  color: "gold" | "amber" | "moonlight";
  progress: number;
  intensity: number;
}

export function ThreadLayer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phase = useArchiveStore((s) => s.phase);
  const activeCitationId = useArchiveStore((s) => s.activeCitationId);
  const pinnedCitationId = useArchiveStore((s) => s.pinnedCitationId);
  const selectedVolumeIds = useArchiveStore((s) => s.selectedVolumeIds);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    const render = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const camera = globalCameraRef.current;

      ctx.clearRect(0, 0, width, height);

      const threadsToDraw: ActiveThread[] = [];

      // 1. Cast thread: from question submit point to selected volume
      if (sceneUniforms.thread.castProgress > 0.01) {
        const targetVol = selectedVolumeIds[0] || "vol-3";
        threadsToDraw.push({
          id: "cast-thread",
          fromId: "question-seal",
          toId: `volume-${targetVol}`,
          color: "gold",
          progress: sceneUniforms.thread.castProgress,
          intensity: 1,
        });
      }

      // 2. Retrieval threads: from distant shelf candidate nodes to desk/tome
      if (sceneUniforms.retrieval.returnThreadsProgress > 0.01) {
        threadsToDraw.push(
          {
            id: "retrieval-1",
            fromId: "retrieval-cand-0",
            toId: "tome-rag-input",
            color: "amber",
            progress: sceneUniforms.retrieval.returnThreadsProgress,
            intensity: sceneUniforms.retrieval.candidateRerank[0] || 1,
          },
          {
            id: "retrieval-2",
            fromId: "retrieval-cand-1",
            toId: "tome-rag-input",
            color: "amber",
            progress: sceneUniforms.retrieval.returnThreadsProgress,
            intensity: sceneUniforms.retrieval.candidateRerank[1] || 1,
          },
          {
            id: "retrieval-3",
            fromId: "retrieval-cand-2",
            toId: "tome-rag-input",
            color: "amber",
            progress: sceneUniforms.retrieval.returnThreadsProgress,
            intensity: sceneUniforms.retrieval.candidateRerank[2] || 1,
          },
        );
      }

      // 3. Evidence thread: from active/pinned citation mark to evidence sheet
      const currentCitation = activeCitationId || pinnedCitationId;
      if (currentCitation && sceneUniforms.thread.evidenceProgress > 0.01) {
        const isRag = currentCitation.includes("rag");
        threadsToDraw.push({
          id: `evidence-${currentCitation}`,
          fromId: `citation-${currentCitation}`,
          toId: "evidence-source-leaf",
          color: isRag ? "gold" : "moonlight",
          progress: sceneUniforms.thread.evidenceProgress,
          intensity: 1,
        });
      }

      // Render each thread
      for (const thread of threadsToDraw) {
        const start = anchorRegistry.getScreenPos(thread.fromId, camera, width, height);
        const end = anchorRegistry.getScreenPos(thread.toId, camera, width, height);

        if (!start || !end) continue;

        const currentP = Math.min(1, Math.max(0, thread.progress));

        // Compute curved control points for an organic flowing arc
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const dist = Math.hypot(dx, dy);

        // Arc offset perpendicular to chord
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        const perpX = -dy / (dist || 1);
        const perpY = dx / (dist || 1);
        const curvature = Math.min(dist * 0.25, 80);

        const cpX = midX + perpX * curvature;
        const cpY = midY + perpY * curvature;

        // Draw sub-segment up to currentP using de Casteljau
        const t = currentP;
        // P(t) on quadratic curve: (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
        const curEndX = (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * cpX + t * t * end.x;
        const curEndY = (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * cpY + t * t * end.y;

        // Sub-control point for the drawn segment:
        const subCpX = (1 - t) * start.x + t * cpX;
        const subCpY = (1 - t) * start.y + t * cpY;

        ctx.save();

        let baseColor = "235, 195, 90"; // gold
        if (thread.color === "amber") baseColor = "240, 160, 50";
        if (thread.color === "moonlight") baseColor = "165, 215, 235";

        // Outer glow
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.quadraticCurveTo(subCpX, subCpY, curEndX, curEndY);
        ctx.strokeStyle = `rgba(${baseColor}, ${0.35 * thread.intensity})`;
        ctx.lineWidth = 4.5;
        ctx.shadowColor = `rgb(${baseColor})`;
        ctx.shadowBlur = 14;
        ctx.stroke();

        // Inner filament
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.quadraticCurveTo(subCpX, subCpY, curEndX, curEndY);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.9 * thread.intensity})`;
        ctx.lineWidth = 1.4;
        ctx.shadowBlur = 4;
        ctx.stroke();

        // Bright leading spark
        if (currentP < 0.99) {
          ctx.beginPath();
          ctx.arc(curEndX, curEndY, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgb(255, 255, 255)`;
          ctx.shadowColor = `rgb(${baseColor})`;
          ctx.shadowBlur = 10;
          ctx.fill();
        }

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [phase, activeCitationId, pinnedCitationId, selectedVolumeIds]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
      aria-hidden="true"
    />
  );
}
