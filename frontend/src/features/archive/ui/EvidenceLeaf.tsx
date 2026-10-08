"use client";

import { useEffect, useRef } from "react";
import { useArchiveStore } from "../store";
import { archiveDirector } from "../director";
import { anchorRegistry } from "../threads/anchors";

export function EvidenceLeaf() {
  const leafRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const activeCitationId = useArchiveStore((s) => s.activeCitationId);
  const pinnedCitationId = useArchiveStore((s) => s.pinnedCitationId);
  const activeEvidence = useArchiveStore((s) => s.activeEvidence);
  const setPinnedCitation = useArchiveStore((s) => s.setPinnedCitation);

  const isVisible =
    Boolean(activeCitationId || pinnedCitationId) && Boolean(activeEvidence);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isVisible || !dialog) return;
    const previous = document.activeElement;
    if (!dialog.open) dialog.showModal();
    return () => {
      dialog.close();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus({ preventScroll: true });
    };
  }, [isVisible]);

  // Register anchor for the evidence thread landing point
  useEffect(() => {
    if (leafRef.current) {
      return anchorRegistry.registerDom(
        "evidence-source-leaf",
        leafRef.current,
        "left",
      );
    }
  }, [isVisible]);

  // Keyboard accessibility: Escape to dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isVisible) {
        setPinnedCitation(null);
        archiveDirector.releaseEvidence();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVisible, setPinnedCitation]);

  if (!isVisible || !activeEvidence) return null;

  const { source, citation, claim } = activeEvidence;
  const characters = Array.from(source.text);
  const before = characters.slice(0, citation.start_offset).join("");
  const resolved = characters.slice(citation.start_offset, citation.end_offset).join("");
  const after = characters.slice(citation.end_offset).join("");
  const exact = resolved === citation.excerpt && citation.excerpt.length > 0;

  const handleDismiss = () => {
    setPinnedCitation(null);
    archiveDirector.releaseEvidence();
  };

  return (
    <dialog
      ref={dialogRef}
      className="evidence-dialog"
      aria-label="Memory source"
      onCancel={(event) => {
        event.preventDefault();
        handleDismiss();
      }}
    >
      <aside
        ref={leafRef}
        role="region"
        aria-label={`Evidence passage: ${source.book}, Chapter ${source.chapter_number}`}
        className="relative"
      >
        {/* Decorative Frame */}
        <div className="pointer-events-none absolute inset-1.5 rounded-xs border border-[#8a671d]/20" />

        {/* Archival Provenance Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#8a671d]/20 pb-3">
          <div className="flex flex-col">
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-[#7a6a52]">
              ARCHIVAL SOURCE LEAF · CITATION [{citation.number}]
            </span>
            <h2 className="font-display text-lg text-[#1b1923] font-semibold mt-0.5">
              {source.book}
            </h2>
            <span className="font-mono text-[10px] text-[#6d5f49]">
              Chapter {source.chapter_number}: {source.chapter} · Page{" "}
              {source.page_label} {source.page_kind === "demo_folio" ? "(illustrative)" : "(PDF)"}
            </span>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss evidence leaf"
            className="touch-target-44 flex items-center justify-center min-w-[44px] min-h-[44px] -mr-2 -mt-2 p-2 rounded-xs hover:bg-[#8a671d]/15 text-[#5e513e] font-mono text-base leading-none transition-colors cursor-pointer touch-manipulation"
          >
            ✕
          </button>
        </div>

        {/* The Cited Passage with Raking Light Highlight */}
        <div className="mt-4 max-h-[42vh] overflow-y-auto pr-2">
          <p className="font-reading text-sm sm:text-base leading-relaxed text-[#231f28]">
            {exact ? (
              <>
                {before}
                <mark className="evidence-highlight">{citation.excerpt}</mark>
                {after}
              </>
            ) : (
              source.text
            )}
          </p>

          {/* Claim Link Confirmation */}
          <div className="mt-4 p-3 rounded-xs bg-[#e0d3b6]/60 border border-[#8a671d]/20 font-reading text-xs italic text-[#4a4034]">
            <span className="font-mono text-[9px] not-italic uppercase font-semibold text-[#6e5d47] block mb-1">
              Linked Claim:
            </span>
            “{claim.text}”
          </div>
        </div>

        {/* Integrity Badges */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#8a671d]/20 pt-3 font-mono text-[10px] text-[#5e523f]">
          <span className="flex items-center gap-1.5 text-[#2e593e] font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2e593e]" />
            {exact ? "Exact quote verified" : "Source passage available"}
          </span>
          <button
            type="button"
            onClick={handleDismiss}
            className="touch-target-44 inline-flex items-center min-h-[44px] py-2 px-2 text-[#8a671d] hover:underline cursor-pointer touch-manipulation"
          >
            Return to tomes (Esc) →
          </button>
        </div>
      </aside>
    </dialog>
  );
}
