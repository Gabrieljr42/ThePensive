"use client";

import { useEffect, useRef } from "react";
import type { ArchiveBranch } from "../model";
import { anchorRegistry } from "../threads/anchors";
import { InkText } from "./InkText";
import { CitationMark } from "./CitationMark";

interface TomeProps {
  branch: ArchiveBranch;
  isRag: boolean;
}

export function Tome({ branch, isRag }: TomeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Register anchor for incoming retrieval threads on RAG tome
  useEffect(() => {
    if (isRag && containerRef.current) {
      return anchorRegistry.registerDom(
        "tome-rag-input",
        containerRef.current,
        "top",
      );
    }
  }, [isRag]);

  const accentColor = isRag ? "border-[#cda857]/40" : "border-[#88c4e0]/40";
  const headerGlow = isRag ? "text-[#f5b041]" : "text-[#9ecadb]";
  const bgGradient = isRag
    ? "bg-gradient-to-b from-[#f5ede0] via-[#ece3cb] to-[#dfd2b5]"
    : "bg-gradient-to-b from-[#edf2f5] via-[#e2ebf0] to-[#d3e0e7]";

  return (
    <div
      ref={containerRef}
      className={`relative flex-1 min-w-0 rounded-sm p-6 sm:p-8 shadow-[0_16px_45px_rgba(0,0,0,0.65)] border ${accentColor} ${bgGradient} text-[#18161d] transition-all duration-300`}
    >
      {/* Decorative Edge Inlay */}
      <div className="pointer-events-none absolute inset-1.5 rounded-xs border border-[#8a671d]/15" />

      {/* Tome Header Inscription */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#8a671d]/20 pb-4">
        <div className="flex items-center gap-2 font-mono text-[11px] tracking-wider font-semibold">
          <span className={headerGlow}>{isRag ? "✦" : "☾"}</span>
          <span className="uppercase text-[#362f26]">
            {isRag
              ? "The First Tome · Focused Retrieval"
              : "The Second Tome · Whole Corpus Attention"}
          </span>
        </div>

        {/* Scope Tag */}
        <span
          className={`px-2 py-0.5 rounded-xs font-mono text-[10px] tracking-wide uppercase font-semibold ${
            isRag
              ? "bg-[#e2c785]/50 text-[#543f14] border border-[#a88235]/30"
              : "bg-[#b8dbeb]/50 text-[#1e4454] border border-[#6b9cb0]/30"
          }`}
        >
          {isRag
            ? branch.context.selected_source_count + " Filtered Passages"
            : branch.context.supplied_source_count > 0
              ? "Prepared Volume Scope"
              : "No prepared evidence"}
        </span>
      </div>

      {/* Answer Title */}
      <h2 className="mt-6 font-display text-2xl sm:text-3xl text-[#1a1721] font-semibold tracking-tight">
        {branch.answer_title}
      </h2>

      {/* Introduction */}
      <div className="mt-3 font-reading italic text-base sm:text-lg text-[#3e3745] leading-relaxed">
        <InkText text={branch.introduction} delayMs={100} />
      </div>

      {/* Claims and Citations List */}
      <div className="mt-6 flex flex-col gap-4 border-t border-[#8a671d]/15 pt-5">
        {branch.claims.map((claim, idx) => (
          <div
            key={claim.id}
            className="flex items-start gap-3 text-sm sm:text-base leading-relaxed"
          >
            <span className="font-mono text-xs text-[#7d6c52] shrink-0 mt-1">
              0{idx + 1}
            </span>
            <div className="font-reading text-[#1c1922]">
              <InkText text={claim.text} delayMs={200 + idx * 150} />
              {claim.citations.map((cit) => (
                <CitationMark key={cit.id} citation={cit} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Conclusion */}
      {branch.conclusion && (
        <div className="mt-6 border-t border-[#8a671d]/15 pt-4 font-reading text-sm sm:text-base italic text-[#4a4252] leading-relaxed">
          <InkText text={branch.conclusion} delayMs={750} />
        </div>
      )}

      {/* Technical Footnote */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[#8a671d]/20 pt-3 text-[10px] font-mono text-[#665a46]">
        <span>
          LATENCY:{" "}
          {branch.metrics.latency_ms == null
            ? "—"
            : (branch.metrics.latency_ms / 1000).toFixed(2) + "s"}
        </span>
        <span>
          INPUT: {branch.metrics.input_tokens?.toLocaleString() ?? "—"} TOKENS
        </span>
        <span>
          EST. COST:{" "}
          {branch.metrics.estimated_cost_usd == null
            ? "—"
            : "$" + branch.metrics.estimated_cost_usd.toFixed(4)}
        </span>
      </div>
    </div>
  );
}
