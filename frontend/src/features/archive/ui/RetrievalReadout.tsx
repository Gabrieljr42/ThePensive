"use client";

import { useArchiveStore } from "../store";

export function RetrievalReadout() {
  const phase = useArchiveStore((s) => s.phase);
  const mode = useArchiveStore((s) => s.mode);

  if (phase !== "retrieving" && phase !== "reading" && phase !== "evidence") {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="relative z-20 w-full rounded-sm bg-[#0a0e16]/90 border border-[#a88235]/30 p-3.5 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-[11px] tracking-wider">
        {/* RAG Telemetry */}
        <div className="flex items-center gap-3 text-[#dcb865]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-[#f5b041] animate-pulse" />
            <strong className="font-semibold uppercase">RAG PIPELINE:</strong>
          </span>
          <span>8 CANDIDATES</span>
          <span className="text-[#6d7b87]">→</span>
          <span>RERANKED TOP-3</span>
          <span className="text-[#6d7b87]">·</span>
          <span>SIM 0.89</span>
          <span className="text-[#6d7b87]">·</span>
          <span className="text-[#ebd09b]">1,842 TOKENS</span>
          <span className="text-[#6d7b87]">·</span>
          <span>1.48s</span>
        </div>

        {/* Full Context Telemetry (if compare or full_context) */}
        {(mode === "compare" || mode === "full_context") && (
          <div className="flex items-center gap-3 text-[#9cc9db]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-[#88c4e0]" />
              <strong className="font-semibold uppercase">FULL CONTEXT:</strong>
            </span>
            <span>WHOLE CHRONICLE SCOPE</span>
            <span className="text-[#6d7b87]">·</span>
            <span className="text-[#cce8f5]">107,200 TOKENS</span>
            <span className="text-[#6d7b87]">·</span>
            <span>11.84s</span>
            <span className="text-[#6d7b87]">·</span>
            <span className="text-[#88c4e0]">$0.268</span>
          </div>
        )}
      </div>
    </div>
  );
}
