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
      <div className="flex items-center justify-end text-xs tracking-wide text-[#c4bba8] font-reading">
        <button
          onClick={() => archiveDirector.jumpToDesk()}
          className="pointer-events-auto underline-offset-4 hover:underline"
        >
          Skip to reading desk
        </button>
      </div>

      <div className="max-w-xl my-auto">
        <h1 className="font-display text-6xl sm:text-8xl tracking-tight text-[#f4efe4]">
          Pensieve
        </h1>

        <div className="mt-3 text-sm sm:text-base font-reading italic text-[#d9d0c0]">
          The Midnight Archive
        </div>

        <p className="mt-8 max-w-md font-reading text-lg sm:text-xl leading-relaxed text-[#e4dccb]">
          Ask the story. Follow the evidence.
        </p>

        <div className="mt-10">
          <button
            onClick={() => archiveDirector.enterArchive()}
            className="pointer-events-auto inline-flex items-center gap-3 border border-[#d9d0c0]/50 bg-[#12161c] px-6 py-3 text-[#f4efe4] focus-visible:outline-2 focus-visible:outline-[#9cc9db]"
          >
            <span className="font-reading text-base">Enter the Archive</span>
          </button>
        </div>
      </div>

      <div className="text-[11px] font-reading tracking-wide text-[#8b93a0]">
        Seven chronicles on the desk
      </div>
    </div>
  );
}
