"use client";

import { useEffect, useRef } from "react";
import { useArchiveStore } from "../store";
import { archiveDirector } from "../director";
import { anchorRegistry } from "../threads/anchors";
import { mockArchiveAdapter } from "../mock/adapter";
import { MARAUDERS_MAP_QUESTION } from "../mock/marauders-map";

export function QuestionLeaf() {
  const sealRef = useRef<HTMLButtonElement | null>(null);

  const question = useArchiveStore((s) => s.question);
  const setQuestion = useArchiveStore((s) => s.setQuestion);
  const selectedVolumeIds = useArchiveStore((s) => s.selectedVolumeIds);
  const mode = useArchiveStore((s) => s.mode);
  const setRun = useArchiveStore((s) => s.setRun);
  const isBusy = useArchiveStore((s) => s.isBusy);

  // Register anchor for the cast thread
  useEffect(() => {
    if (sealRef.current) {
      return anchorRegistry.registerDom("question-seal", sealRef.current, "center");
    }
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isBusy || !question.trim()) return;

    // Trigger cast ceremony and resolve data concurrently
    const runPromise = mockArchiveAdapter.createRun(
      {
        question: question.trim(),
        mode,
        corpus_id: "harry-potter-archive",
        corpus_version: "vol-3-poa",
      },
      selectedVolumeIds,
    );

    archiveDirector.castQuestion(async () => {
      const activeRun = await runPromise;
      setRun(activeRun);
    });
  };

  const suggestions = [
    {
      label: "The Marauder's Map",
      q: MARAUDERS_MAP_QUESTION,
    },
    {
      label: "The Mirror of Erised",
      q: "What does the Mirror of Erised reveal, and why is it dangerous?",
    },
    {
      label: "The Philosopher's Stone",
      q: "Why can Harry retrieve the Philosopher's Stone from the mirror?",
    },
  ];

  return (
    <div className="relative w-full rounded-sm deckle-paper p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
      {/* Ancient Ledger Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#8a671d]/20 pb-3 font-mono text-[11px] tracking-wider text-[#63553e]">
        <span className="uppercase font-semibold">
          MANUSCRIPT INQUIRY · DESK ENTRY
        </span>
        <span className="text-[#847359]">
          Press Ctrl + Enter or strike the wax seal
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-4">
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
        <div className="mt-4 flex flex-wrap items-center gap-2">
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
              }}
              className="px-2.5 py-1 rounded-xs bg-[#ddcfb3]/70 hover:bg-[#d4c3a1] text-[#362f26] font-reading text-xs transition-colors border border-[#8a671d]/15"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Action Bottom Row with Wax Seal Submit */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2 text-xs font-mono text-[#6e5e49]">
            <span>SCOPE:</span>
            <span className="font-semibold text-[#3b3226]">
              {selectedVolumeIds.length} Volume{selectedVolumeIds.length > 1 ? "s" : ""}
            </span>
          </div>

          {/* Red Wax Seal Submit Button */}
          <button
            ref={sealRef}
            type="submit"
            disabled={isBusy}
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
    </div>
  );
}
