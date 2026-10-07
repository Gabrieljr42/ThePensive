"use client";

import { Component, useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
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
import { RoomSettings } from "./ui/RoomSettings";
import { sceneUniforms } from "./uniforms";

const ArchiveCanvas = dynamic(
  () => import("./scene/ArchiveCanvas").then((mod) => mod.ArchiveCanvas),
  { ssr: false },
);
class SceneBoundary extends Component<
  { children: ReactNode; onUnavailable: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error("Pensieve room unavailable", error);
    this.props.onUnavailable();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function MidnightArchive({
  initialPhase = "dark",
}: {
  initialPhase?: "dark" | "desk";
}) {
  const phase = useArchiveStore((s) => s.phase);
  const ready = useArchiveStore((s) => s.qualityGate.mounted);
  const quiet = useArchiveStore((s) => s.quietReading);
  const reduced = useArchiveStore((s) => s.reducedMotion);
  const [sceneReady, setSceneReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const atDesk = !["dark", "threshold", "approaching"].includes(phase);
  useEffect(() => {
    let cancelled = false;
    const s = useArchiveStore.getState();
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    s.setReducedMotion(media.matches);
    const change = (event: MediaQueryListEvent) => {
      useArchiveStore.getState().setReducedMotion(event.matches);
      if (event.matches) archiveDirector.settleMotion();
    };
    media.addEventListener("change", change);
    detectArchiveQualityTier().then((tier) => {
      if (!cancelled) useArchiveStore.getState().setQualityTier(tier);
    });
    const id = window.setTimeout(() => setSceneReady(true), 0);
    if (initialPhase === "desk") archiveDirector.jumpToDesk();
    else archiveDirector.resetView();
    return () => {
      cancelled = true;
      window.clearTimeout(id);
      media.removeEventListener("change", change);
      archiveDirector.dispose();
      useArchiveStore.getState().cancelInquiry();
    };
  }, [initialPhase]);
  return (
    <main
      className={
        "archive-room " +
        (atDesk ? "is-at-desk " : "") +
        (phase === "reading" || phase === "evidence" ? "is-reading " : "")
      }
      data-phase={phase}
      data-still={quiet || reduced}
      data-scene-status={unavailable ? "fallback" : ready ? "ready" : "loading"}
    >
      <a
        href="#archive-research-desk"
        onClick={(event) => {
          event.preventDefault();
          archiveDirector.jumpToDesk();
        }}
        className="archive-skip-link"
      >
        Skip directly to Research Desk
      </a>
      {!atDesk && (
        <div id="archive-research-desk" tabIndex={-1} className="sr-only"
          onFocus={() => archiveDirector.jumpToDesk()} />
      )}
      <div
        className="room-poster"
        data-ready={ready && !unavailable}
        aria-hidden="true"
      />
      {sceneReady && !unavailable && (
        <SceneBoundary onUnavailable={() => setUnavailable(true)}>
          <ArchiveCanvas onUnavailable={() => setUnavailable(true)} />
        </SceneBoundary>
      )}
      <div className="room-scrim" aria-hidden="true" />
      <div className="room-settings-dock">
        <RoomSettings />
      </div>
      <ThreadLayer />
      <ThresholdTitle />
      {atDesk && (
        <div className="research-shell">
          <header className="research-header">
            <Link
              href="/"
              className="archive-brand"
              onClick={(event) => {
                event.preventDefault();
                archiveDirector.resetView();
              }}
            >
              <span className="archive-brand-mark" aria-hidden="true">
                ◌
              </span>
              <span>
                <h1>Pensieve</h1>
                <span className="brand-subtitle">The Midnight Archive</span>
              </span>
            </Link>
          </header>
          <div className="memory-stage">
            <div className="stage-note">
              <span className="archive-eyebrow">The chamber of memories</span>
              <p>
                A thought,
                <br />
                <em>given form.</em>
              </p>
              <span className="stage-instruction">
                Choose a chronicle. Ask the archive.
              </span>
            </div>
            <button
              type="button"
              className="pensieve-touch"
              onClick={() => archiveDirector.stir()}
              onPointerEnter={() => {
                sceneUniforms.basin.hover = 1;
                useArchiveStore.getState().setHoveredVolume(null);
              }}
              onPointerLeave={() => {
                sceneUniforms.basin.hover = 0;
                useArchiveStore.getState().setHoveredVolume(null);
              }}
              onFocus={() => {
                sceneUniforms.basin.hover = 1;
                useArchiveStore.getState().setHoveredVolume(null);
              }}
              onBlur={() => {
                sceneUniforms.basin.hover = 0;
                useArchiveStore.getState().setHoveredVolume(null);
              }}
              aria-label="Stir the Pensieve"
            >
              <span aria-hidden="true">≈</span> Touch the silver
            </button>
            {unavailable && (
              <p className="room-unavailable" role="status">
                The room preview is resting. You can still consult the archive.
              </p>
            )}
          </div>
          <section
            id="archive-research-desk"
            tabIndex={-1}
            className="archive-workbench"
            aria-label="Research desk"
          >
            <div className="corpus-column">
              <VolumeProxies />
            </div>
            <div className="inquiry-column">
              <div className="inquiry-heading">
                <MethodAstrolabe />
                <span className="demo-label">Prepared demonstration</span>
              </div>
              <QuestionLeaf />
            </div>
          </section>
          <div className="archive-results">
            <RetrievalReadout />
            <TwinTomes />
          </div>
          <footer className="archive-footer">
            <span>Ask the story. Follow the evidence.</span>
            <button type="button" onClick={() => archiveDirector.resetView()}>
              Return to the entrance ↗
            </button>
          </footer>
        </div>
      )}
      <EvidenceLeaf />
    </main>
  );
}
