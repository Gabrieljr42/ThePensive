"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useArchiveStore } from "./store";
import { archiveDirector } from "./director";
import { detectArchiveQualityTier } from "./quality";
import { ThreadLayer } from "./threads/ThreadLayer";
import { ThresholdTitle } from "./ui/ThresholdTitle";
import { VolumeProxies } from "./ui/VolumeProxies";
import { MethodAstrolabe } from "./ui/MethodAstrolabe";
import { QuestionLeaf } from "./ui/QuestionLeaf";
import { RetrievalReadout } from "./ui/RetrievalReadout";
import { TwinTomes } from "./ui/TwinTomes";
import { EvidenceLeaf } from "./ui/EvidenceLeaf";

// Dynamically import Canvas to ensure clean SSR hydration
const ArchiveCanvas = dynamic(
  () => import("./scene/ArchiveCanvas").then((mod) => mod.ArchiveCanvas),
  { ssr: false },
);

interface MidnightArchiveProps {
  initialPhase?: "dark" | "desk";
}

export function MidnightArchive({ initialPhase = "dark" }: MidnightArchiveProps) {
  const phase = useArchiveStore((s) => s.phase);
  const setPhase = useArchiveStore((s) => s.setPhase);
  const setQualityTier = useArchiveStore((s) => s.setQualityTier);
  const setReducedMotion = useArchiveStore((s) => s.setReducedMotion);

  useEffect(() => {
    // Detect quality tier and reduced motion
    detectArchiveQualityTier().then(setQualityTier);

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };
    mediaQuery.addEventListener("change", handleMotionChange);

    // Deep link directly to desk if requested
    if (initialPhase === "desk") {
      archiveDirector.jumpToDesk();
    }

    return () => mediaQuery.removeEventListener("change", handleMotionChange);
  }, [initialPhase, setPhase, setQualityTier, setReducedMotion]);

  const atDesk = phase !== "dark" && phase !== "threshold" && phase !== "approaching";

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-[#05070a] text-[#f4ecd8] select-none">
      {/* Accessible Skip Link */}
      <a
        href="#archive-research-desk"
        onClick={(e) => {
          e.preventDefault();
          archiveDirector.jumpToDesk();
        }}
        className="archive-skip-link"
      >
        Skip directly to Research Desk
      </a>

      {/* Procedural 3D Environment Layer */}
      <ArchiveCanvas />

      {/* Luminous Provenance Thread Layer */}
      <ThreadLayer />

      {/* Procedural Film Grain Texture */}
      <div className="film-grain-overlay" aria-hidden="true" />

      {/* Threshold / Entrance Title Card */}
      <ThresholdTitle />

      {/* Research Desk Workspace (Revealed after entering) */}
      <div
        id="archive-research-desk"
        className={`relative z-20 mx-auto max-w-7xl px-4 sm:px-8 py-8 transition-opacity duration-700 ${
          atDesk ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Top Archival Header Bar */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#a88235]/25 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="font-display text-2xl tracking-tight text-[#faecd5]">
              Pensieve
            </span>
            <span className="font-reading italic text-sm text-[#c4b18c]">
              The Midnight Archive
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <button
              type="button"
              onClick={() => archiveDirector.enterArchive()}
              className="text-[#96a4b2] hover:text-[#faecd5] transition-colors"
            >
              Reset View
            </button>
            <span className="text-[#a88235]">·</span>
            <span className="text-[#a89572]">EXP. NO. 0001 (RAG VS FULL)</span>
          </div>
        </header>

        {/* Desk Workspace Grid */}
        <div className="flex flex-col lg:flex-row items-start gap-8">
          {/* Left Column: Folio Shelf Selection */}
          <div className="w-full lg:w-64 shrink-0">
            <VolumeProxies />
          </div>

          {/* Center Column: Question Leaf, Astrolabe, Readout, and Twin Tomes */}
          <div className="flex-1 min-w-0 flex flex-col gap-6 w-full">
            {/* Top Method Astrolabe Selector */}
            <div className="flex justify-center sm:justify-start">
              <MethodAstrolabe />
            </div>

            {/* Manuscript Question Composer */}
            <QuestionLeaf />

            {/* Real-time Retrieval Readout Telemetry */}
            <RetrievalReadout />

            {/* The Showpiece: Twin Tomes */}
            <TwinTomes />
          </div>
        </div>
      </div>

      {/* Floating Evidence Source Leaf */}
      <EvidenceLeaf />
    </main>
  );
}
