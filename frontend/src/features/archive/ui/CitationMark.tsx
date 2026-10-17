"use client";

import { useEffect, useRef } from "react";
import type { Citation } from "@/lib/contracts";
import { useArchiveStore } from "../store";
import { archiveDirector } from "../director";
import { anchorRegistry } from "../threads/anchors";
import { resolveRunEvidence } from "../presentation";

interface CitationMarkProps {
  citation: Citation;
}

export function CitationMark({ citation }: CitationMarkProps) {
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const activeCitationId = useArchiveStore((s) => s.activeCitationId);
  const pinnedCitationId = useArchiveStore((s) => s.pinnedCitationId);
  const setPinnedCitation = useArchiveStore((s) => s.setPinnedCitation);
  const setActiveEvidence = useArchiveStore((s) => s.setActiveEvidence);

  const isCurrent =
    activeCitationId === citation.id || pinnedCitationId === citation.id;
  const isPinned = pinnedCitationId === citation.id;

  // Register anchor for the luminous provenance thread
  useEffect(() => {
    if (btnRef.current) {
      return anchorRegistry.registerDom(
        `citation-${citation.id}`,
        btnRef.current,
        "right",
      );
    }
  }, [citation.id]);

  const handleInspect = () => {
    const store = useArchiveStore.getState();
    if (store.run) {
      const ev = resolveRunEvidence(store.run, citation.id);
      if (!ev) return;
      setActiveEvidence(ev);
      archiveDirector.inspectEvidence(citation.id);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const pinned = useArchiveStore.getState().pinnedCitationId;
    if (pinned === citation.id) {
      setPinnedCitation(null);
      archiveDirector.releaseEvidence();
    } else {
      setPinnedCitation(citation.id);
      handleInspect();
    }
  };

  return (
    <button
      ref={btnRef}
      type="button"
      aria-label={`Inspect citation [${citation.number}]: ${citation.excerpt.slice(0, 40)}...`}
      aria-pressed={isPinned}
      onClick={handleClick}
      className={`touch-target-44 relative inline-flex items-center justify-center mx-1 px-1.5 py-0.5 rounded-xs font-mono text-[11px] font-semibold transition-all duration-200 cursor-pointer align-baseline touch-manipulation before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:min-w-[44px] before:min-h-[44px] before:w-full before:h-full ${
        isCurrent
          ? "bg-[#cda857] text-[#141219] shadow-[0_0_12px_#cda857] scale-105"
          : "bg-[#8a671d]/20 text-[#cda857] hover:bg-[#cda857]/40 border border-[#8a671d]/30"
      }`}
    >
      [{citation.number}]
    </button>
  );
}
