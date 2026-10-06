"use client";

import { useState } from "react";
import { useArchiveStore } from "../store";
import { Tome } from "./Tome";
import { GutterScale } from "./GutterScale";

export function TwinTomes() {
  const phase = useArchiveStore((s) => s.phase);
  const mode = useArchiveStore((s) => s.mode);
  const run = useArchiveStore((s) => s.run);
  const [mobileTab, setMobileTab] = useState<"rag" | "full">("rag");

  if (phase !== "reading" && phase !== "evidence") {
    return null;
  }

  if (!run || !run.branches || run.branches.length === 0) {
    return null;
  }

  const ragBranch = run.branches.find((b) => b.method === "rag");
  const fullBranch = run.branches.find((b) => b.method === "full_context");

  const isCompare = mode === "compare" && ragBranch && fullBranch;

  return (
    <section aria-label="Archive Reading Tomes" className="relative z-20 w-full mt-2">
      {/* Mobile Tab Toggle for Compare Mode */}
      {isCompare && (
        <div className="flex xl:hidden mb-4 p-1 rounded-xs bg-[#0b0e14]/90 border border-[#a88235]/30">
          <button
            type="button"
            onClick={() => setMobileTab("rag")}
            className={`flex-1 py-2 font-mono text-xs tracking-wider rounded-xs transition-colors ${
              mobileTab === "rag"
                ? "bg-[#241c12] text-[#f5b041] border border-[#d4af37]/60"
                : "text-[#8d9aa6]"
            }`}
          >
            ✦ The First Tome (RAG)
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("full")}
            className={`flex-1 py-2 font-mono text-xs tracking-wider rounded-xs transition-colors ${
              mobileTab === "full"
                ? "bg-[#14232c] text-[#88c4e0] border border-[#6b9cb0]/60"
                : "text-[#8d9aa6]"
            }`}
          >
            ☾ The Second Tome (Full)
          </button>
        </div>
      )}

      {/* Side-by-Side Twin Tomes with Dark Central Gutter */}
      <div className="flex flex-col xl:flex-row items-stretch gap-6">
        {/* Left / RAG Tome */}
        {ragBranch && (isCompare ? (
          <div className={`flex-1 ${mobileTab === "rag" ? "block" : "hidden xl:block"}`}>
            <Tome branch={ragBranch} isRag={true} />
          </div>
        ) : mode === "rag" ? (
          <div className="w-full max-w-4xl mx-auto">
            <Tome branch={ragBranch} isRag={true} />
          </div>
        ) : null)}

        {/* Central Gutter Measurement Scale */}
        {isCompare && (
          <GutterScale ragBranch={ragBranch} fullBranch={fullBranch} />
        )}

        {/* Right / Full Context Tome */}
        {fullBranch && (isCompare ? (
          <div className={`flex-1 ${mobileTab === "full" ? "block" : "hidden xl:block"}`}>
            <Tome branch={fullBranch} isRag={false} />
          </div>
        ) : mode === "full_context" ? (
          <div className="w-full max-w-4xl mx-auto">
            <Tome branch={fullBranch} isRag={false} />
          </div>
        ) : null)}
      </div>
    </section>
  );
}
