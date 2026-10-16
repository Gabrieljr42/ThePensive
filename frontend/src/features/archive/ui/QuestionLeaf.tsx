"use client";

import { useEffect, useRef } from "react";
import { useArchiveStore } from "../store";
import { archiveDirector } from "../director";
import { anchorRegistry } from "../threads/anchors";
import { submitInquiry } from "../inquiry/controller";
import { MARAUDERS_MAP_QUESTION } from "../mock/marauders-map";
import { MIRROR_OF_ERISED_QUESTION } from "../mock/mirror-of-erised";
import { PHILOSOPHERS_STONE_QUESTION } from "../mock/philosophers-stone";
import { InquiryStatus } from "./InquiryStatus";
import { ScopePicker } from "./ScopePicker";

export function QuestionLeaf() {
  const sealRef = useRef<HTMLButtonElement | null>(null);

  const question = useArchiveStore((s) => s.question);
  const setQuestion = useArchiveStore((s) => s.setQuestion);
  const selectedVolumeIds = useArchiveStore((s) => s.selectedVolumeIds);
  const selectSingleVolume = useArchiveStore((s) => s.selectSingleVolume);
  const mode = useArchiveStore((s) => s.mode);
  const isBusy = useArchiveStore((s) => s.isBusy);
  const error = useArchiveStore((s) => s.error);
  const corpus = useArchiveStore((s) => s.corpus);
  const selectedChapterIds = useArchiveStore((s) => s.selectedChapterIds);
  const availability = useArchiveStore((s) => s.availability);
  const availabilityError = useArchiveStore((s) => s.availabilityError);

  // Register anchor for the cast thread
  useEffect(() => {
    if (sealRef.current) {
      return anchorRegistry.registerDom(
        "question-seal",
        sealRef.current,
        "center",
      );
    }
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isBusy || !question.trim() || availability === "checking" || availability === "unavailable") return;
    if (corpus && !selectedChapterIds.length) return;

    const isVol1 =
      selectedVolumeIds.includes("vol-1") &&
      !selectedVolumeIds.includes("vol-3");

    await submitInquiry(
      {
        question: question.trim(),
        mode,
        corpus_id: corpus?.id ?? "harry-potter-archive",
        corpus_version: corpus?.version ?? (isVol1 ? "vol-1-ps" : "vol-3-poa"),
        ...(corpus ? {
          book_ids: (corpus.books ?? [])
            .filter((book) => selectedChapterIds.some((chapterId) =>
              book.chapters.some((chapter) => chapter.id === chapterId),
            ))
            .map((book) => book.id),
          chapter_ids: selectedChapterIds,
        } : {}),
      },
      selectedVolumeIds,
    );
  };

  const demoSuggestions = [
    {
      label: "The Marauder's Map",
      q: MARAUDERS_MAP_QUESTION,
      volumeId: "vol-3",
    },
    {
      label: "The Mirror of Erised",
      q: MIRROR_OF_ERISED_QUESTION,
      volumeId: "vol-1",
    },
    {
      label: "The Philosopher's Stone",
      q: PHILOSOPHERS_STONE_QUESTION,
      volumeId: "vol-1",
    },
  ];
  const suggestions: { label: string; q: string; volumeId?: string }[] = corpus
    ? corpus.examples.map((example) => ({ label: example.label, q: example.question }))
    : availability === "demo"
      ? demoSuggestions
      : [];

  return (
    <div className="question-manuscript relative w-full deckle-paper">
      {/* Ancient Ledger Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#8a671d]/20 pb-3 font-mono text-[11px] tracking-wider text-[#63553e]">
        <span className="uppercase font-semibold">
          MANUSCRIPT INQUIRY · DESK ENTRY
        </span>
        <span className="text-[#847359]">
          Press Ctrl + Enter or strike the wax seal
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-4" aria-busy={isBusy}>
        <p className="mb-3 font-mono text-[10px] text-[#63553e]">
          {availability === "checking"
            ? "Checking archive availability…"
            : availability === "unavailable"
              ? "Live archive unavailable"
              : availability === "live"
                ? "Live inquiry · supplied English PDF · measured API usage"
                : "Recorded demonstration · prepared answers and illustrative measurements"}
        </p>
        {availabilityError && <p role="alert" className="inquiry-error">{availabilityError}</p>}
        <ScopePicker />
        {corpus && !suggestions.length && (
          <p className="mt-3 text-xs text-[#63553e]">
            This corpus has no catalogue questions. Choose chapters and write a question.
          </p>
        )}
        {/* Ruled Manuscript Writing Area */}
        <div className="relative">
          <label htmlFor="archive-inquiry-input" className="sr-only">
            Inscribe your question for the archive
          </label>
          <textarea
            id="archive-inquiry-input"
            rows={2}
            value={question}
            disabled={isBusy}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Inscribe a question into the midnight archive..."
            className="w-full resize-none bg-transparent font-reading italic text-xl sm:text-2xl text-[#1a1820] placeholder-[#8f8373] outline-none leading-relaxed border-b border-[#8a671d]/30 focus:border-[#8a671d] transition-colors"
          />
        </div>

        {/* Suggestion Pills */}
        {suggestions.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] tracking-wider text-[#73634e] uppercase mr-1">
            Catalogued Curiosities:
          </span>
          {suggestions.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={isBusy}
              onClick={() => {
                setQuestion(item.q);
                if (!corpus && item.volumeId && !selectedVolumeIds.includes(item.volumeId)) {
                  selectSingleVolume(item.volumeId);
                }
              }}
              className="px-2.5 py-1 rounded-xs bg-[#ddcfb3]/70 hover:bg-[#d4c3a1] text-[#362f26] font-reading text-xs transition-colors border border-[#8a671d]/15"
            >
              {item.label}
            </button>
          ))}
        </div>}

        {/* Action Bottom Row with Wax Seal Submit */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2 text-xs font-mono text-[#6e5e49]">
            <span>SCOPE:</span>
            <span className="font-semibold text-[#3b3226]">
              {selectedVolumeIds.length} Volume
              {selectedVolumeIds.length > 1 ? "s" : ""}
            </span>
          </div>
          {isBusy && (
            <button
              type="button"
              className="cancel-inquiry"
              onClick={() => archiveDirector.cancelInquiry()}
            >
              Cancel inquiry
            </button>
          )}

          {/* Red Wax Seal Submit Button */}
          <button
            ref={sealRef}
            type="submit"
            disabled={isBusy || availability === "checking" || availability === "unavailable" || (Boolean(corpus) && selectedChapterIds.length === 0)}
            className="group relative inline-flex items-center gap-3 px-6 py-2.5 rounded-xs bg-gradient-to-r from-[#6e1e1b] via-[#852521] to-[#6e1e1b] hover:from-[#7e221f] hover:to-[#7e221f] text-[#faedd9] font-mono text-xs tracking-widest uppercase font-semibold shadow-[0_4px_16px_rgba(110,30,27,0.4)] border border-[#a83a34] transition-all duration-200 active:scale-95 disabled:opacity-60"
          >
            <span className="text-[#e89a95] group-hover:rotate-45 transition-transform duration-300">
              ✦
            </span>
            <span>{isBusy ? "Consulting..." : "Ask the Archive"}</span>
            <span className="text-sm font-reading not-italic text-[#e89a95]">
              →
            </span>
          </button>
        </div>
      </form>
      <InquiryStatus />
      {error && (
        <p role="alert" className="inquiry-error">
          {error}
        </p>
      )}
      {corpus && selectedChapterIds.length === 0 && (
        <p role="status" className="inquiry-error">
          Select at least one available chapter. The live archive will not expand an empty scope.
        </p>
      )}
    </div>
  );
}
