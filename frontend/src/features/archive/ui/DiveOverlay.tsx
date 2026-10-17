"use client";
import { useEffect, useRef } from "react";
import { useArchiveStore } from "../store";
import { archiveDirector } from "../director";
import { InquiryStatus, useInquiryElapsed } from "./InquiryStatus";
import { memoryFragments } from "../memoryWalk";

const copy = {
  idle: ["", ""],
  offering: ["A thought, set free.", "The ink meets the silver."],
  approaching: [
    "The memory calls.",
    "Follow your thought beneath the surface.",
  ],
  crossing: ["Between ink and memory.", "The archive opens within."],
  within: ["Within the memory.", "Two ways to remember. One question."],
  waiting: ["Within the memory.", "Your inquiry is still in progress."],
  arriving: ["A memory, given words.", "Your answer is ready to read."],
};
export function DiveOverlay() {
  const phase = useArchiveStore((s) => s.divePhase);
  const run = useArchiveStore((s) => s.run);
  const selectedMode = useArchiveStore((s) => s.mode);
  const paused = useArchiveStore((s) => s.journeyPaused);
  const question = useArchiveStore((s) => s.question);
  const mode = run?.mode ?? selectedMode;
  const ref = useRef<HTMLDivElement>(null);
  const active = phase !== "idle" && phase !== "arriving";
  const elapsed = useInquiryElapsed();
  useEffect(() => {
    if (!active) return;
    const panel = ref.current;
    // Keep keyboard controls in the HTML layer while the covered desk is inert.
    if (panel && !panel.contains(document.activeElement))
      panel.focus({ preventScroll: true });
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        archiveDirector.skipDive();
      }
    }
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [active]);
  useEffect(() => {
    if (phase === "arriving" && ref.current?.contains(document.activeElement)) {
      document
        .getElementById("archive-reading-tomes")
        ?.focus({ preventScroll: true });
    }
  }, [phase]);
  useEffect(() => {
    const visibility = () =>
      document.hidden
        ? archiveDirector.suspendDive()
        : archiveDirector.resumeDive();
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  if (phase === "idle") return null;
  const title = copy[phase][0];
  const description =
    phase === "within" && mode !== "compare"
      ? "Your question moves through the archive."
      : phase === "waiting"
        ? paused
          ? "The ink waits for you."
          : "Follow the floating pages. The ink remembers."
        : copy[phase][1];
  const sources = run?.sources.slice(0, 3) ?? [];
  return (
    <div
      ref={ref}
      className="dive-overlay"
      data-dive-phase={phase}
      data-long-wait={elapsed >= 20}
      tabIndex={-1}
      role="region"
      aria-label="Memory journey"
      aria-hidden={phase === "arriving" ? true : undefined}
    >
      <div className="dive-caption">
        <span className="archive-eyebrow">
          The descent ·{" "}
          {mode === "compare"
            ? "RAG / Full Context"
            : mode === "rag"
              ? "RAG"
              : "Full Context"}
        </span>
        <p className="dive-title">{title}</p>
        <p className="dive-description">{description}</p>
      </div>
      {active && (
        <div className="dive-console">
          <div
            className="sr-only"
            role="region"
            aria-label="Floating memory fragments"
          >
            {memoryFragments(run, question).map((fragment) => (
              <div key={fragment.id}>
                <h2>{fragment.title}</h2>
                <p>{fragment.text}</p>
                <span>{fragment.label}</span>
              </div>
            ))}
          </div>
          <InquiryStatus />
          {(phase === "within" || phase === "waiting") &&
            sources.length > 0 && (
              <div
                className="dive-sources"
                aria-label="Received source references"
              >
                {sources.map((source) => (
                  <span key={source.id}>
                    {source.book_short} · {source.chapter}
                  </span>
                ))}
              </div>
            )}
          <div className="dive-actions">
            {phase === "waiting" && (
              <button
                type="button"
                aria-pressed={paused}
                onClick={() =>
                  useArchiveStore.getState().setJourneyPaused(!paused)
                }
              >
                {paused ? "Resume journey" : "Pause journey"}
              </button>
            )}
            <button
              type="button"
              className="dive-skip"
              onClick={() => archiveDirector.skipDive()}
            >
              Skip animation <span aria-hidden="true">↗</span>
            </button>
            <button
              type="button"
              onClick={() => archiveDirector.cancelInquiry()}
            >
              Cancel inquiry
            </button>
            <span className="dive-shortcut">Esc · wait at the desk</span>
          </div>
        </div>
      )}
    </div>
  );
}
