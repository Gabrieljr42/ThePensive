"use client";

import { useEffect, useState } from "react";
import { useArchiveStore } from "../store";
import { archiveDirector } from "../director";
import { sceneUniforms } from "../uniforms";

export function ThresholdTitle() {
  const phase = useArchiveStore((s) => s.phase);
  const setPhase = useArchiveStore((s) => s.setPhase);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    // Initial moment of pure atmospheric darkness, then faint light emerges
    const timer = setTimeout(() => {
      setRevealed(true);
      if (phase === "dark") {
        setPhase("threshold");
        sceneUniforms.environment.darkness = 0.4;
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [phase, setPhase]);

  if (phase !== "dark" && phase !== "threshold" && phase !== "approaching") {
    return null;
  }

  const isExiting = phase === "approaching";

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-8 sm:p-14 transition-opacity duration-1000 ${
        revealed && !isExiting ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Top Ledger Annotation */}
      <div className="flex items-center justify-between text-xs tracking-widest text-[#a8987b] font-mono">
        <span className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#cda857] shadow-[0_0_8px_#cda857]" />
          ARCHIVE ACCESSION NO. 0001
        </span>
        <button
          onClick={() => archiveDirector.jumpToDesk()}
          className="pointer-events-auto text-[#cda857] hover:text-[#fae5b2] hover:underline"
        >
          Skip to reading desk →
        </button>
      </div>

      {/* Main Title Composition - Cinematic Framing */}
      <div className="max-w-2xl my-auto">
        <div className="mb-4 text-xs font-mono tracking-[0.25em] text-[#bda980] uppercase">
          An Experimental Knowledge System
        </div>

        <h1 className="font-display text-6xl sm:text-8xl tracking-tight text-[#fbf5e6] drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)]">
          Pensieve
        </h1>

        <div className="mt-2 text-sm sm:text-base font-reading italic tracking-wide text-[#d4c19c]">
          The Midnight Archive
        </div>

        <p className="mt-8 max-w-lg font-reading text-lg sm:text-xl leading-relaxed text-[#dfd4be]">
          Ask the story. Follow the evidence.
          <span className="block mt-2 text-sm text-[#9fadba] font-reading not-italic">
            A forgotten sanctuary comparing Retrieval-Augmented Generation against Full-Context LLM attention.
          </span>
        </p>

        {/* Enter CTA */}
        <div className="mt-10">
          <button
            onClick={() => archiveDirector.enterArchive()}
            className="pointer-events-auto group relative inline-flex items-center gap-4 px-8 py-3.5 bg-[#121822]/80 backdrop-blur-sm border border-[#cda857]/40 hover:border-[#cda857] rounded-sm text-[#fae5b2] transition-all duration-300 hover:shadow-[0_0_24px_rgba(205,168,87,0.25)] focus-visible:outline-2 focus-visible:outline-[#9cc9db]"
          >
            <span className="font-mono text-xs tracking-[0.2em] uppercase font-semibold">
              Enter the Archive
            </span>
            <span className="text-base transition-transform duration-300 group-hover:translate-x-1 text-[#cda857]">
              →
            </span>
            <span className="absolute bottom-0 left-0 h-[1px] w-full bg-gradient-to-r from-transparent via-[#cda857] to-transparent opacity-50 group-hover:opacity-100" />
          </button>
        </div>
      </div>

      {/* Bottom Architectural Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-[11px] font-mono tracking-wider text-[#7e8c99]">
        <span>METHODOLOGY: VECTOR RAG VS FULL-ATTENTION</span>
        <span>CORPUS: SEVEN ORIGINAL CHRONICLES (1997–2007)</span>
      </div>
    </div>
  );
}
