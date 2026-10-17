"use client";
import { useEffect } from "react";
import { useArchiveStore } from "../store";
import { archiveDirector } from "../director";

export function ThresholdTitle() {
  const phase = useArchiveStore((s) => s.phase);
  useEffect(() => {
    if (useArchiveStore.getState().phase === "dark")
      useArchiveStore.getState().setPhase("threshold");
  }, []);
  if (!["dark", "threshold", "approaching"].includes(phase)) return null;
  return (
    <div className="archive-threshold" data-exiting={phase === "approaching"}>
      <header className="threshold-header">
        <span className="archive-eyebrow">A chamber of memories</span>
      </header>
      <div className="threshold-content">
        <span className="threshold-ornament" aria-hidden="true">
          ◌
        </span>
        <h1>Pensieve</h1>
        <p className="threshold-subtitle">The Midnight Archive</p>
        <p className="threshold-promise">
          Ask the story.
          <br /> Follow the evidence.
        </p>
        <button
          type="button"
          id="archive-enter"
          disabled={phase === "approaching"}
          onClick={() => archiveDirector.enterArchive()}
          className="archive-enter"
        >
          Enter the Archive <span aria-hidden="true">↗</span>
        </button>
        <button
          type="button"
          onClick={() => archiveDirector.jumpToDesk()}
          className="threshold-skip"
        >
          Skip to reading desk →
        </button>
      </div>
      <footer className="threshold-footer">
        <span>Seven chronicles on the desk</span>
        <span>A prepared exploration of RAG & Full Context</span>
      </footer>
    </div>
  );
}
