"use client";

import { useArchiveStore } from "../store";
import type { Mode } from "@/lib/contracts";

export function MethodAstrolabe() {
  const mode = useArchiveStore((s) => s.mode);
  const setMode = useArchiveStore((s) => s.setMode);
  const isBusy = useArchiveStore((s) => s.isBusy);

  const methods: { id: Mode; label: string; desc: string; icon: string }[] = [
    {
      id: "rag",
      label: "RAG",
      desc: "Vector search & top-k reranked passages",
      icon: "✦",
    },
    {
      id: "compare",
      label: "COMPARE",
      desc: "Twin Tomes: Observe both forms side-by-side",
      icon: "⚔",
    },
    {
      id: "full_context",
      label: "FULL CONTEXT",
      desc: "Complete chronicle held in active attention",
      icon: "☾",
    },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Experiment Methodology"
      className="relative flex items-center justify-center p-1.5 rounded-sm bg-[#0c1017]/80 border border-[#a88235]/40 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
    >
      <div className="flex items-center gap-1 sm:gap-2">
        {methods.map((m) => {
          const isSelected = mode === m.id;

          return (
            <button
              key={m.id}
              role="radio"
              aria-checked={isSelected}
              disabled={isBusy}
              onClick={() => setMode(m.id)}
              className={`group relative flex items-center gap-2 px-3.5 sm:px-5 py-2 rounded-xs font-mono text-xs tracking-wider transition-all duration-200 ${
                isSelected
                  ? "bg-gradient-to-r from-[#211a12] via-[#2a2115] to-[#211a12] text-[#f7e6b8] border border-[#d4af37]/80 shadow-[0_0_16px_rgba(212,175,55,0.2)]"
                  : "text-[#8d9aa6] hover:text-[#e0d6c3] hover:bg-[#151c27]/60 border border-transparent"
              }`}
            >
              <span
                className={`text-[11px] ${
                  isSelected ? "text-[#d4af37]" : "text-[#5e6b77] group-hover:text-[#a8987b]"
                }`}
              >
                {m.icon}
              </span>
              <span className="font-semibold">{m.label}</span>

              {/* Bottom fine brass filigree when selected */}
              {isSelected && (
                <span className="absolute bottom-0 left-2 right-2 h-[1px] bg-gradient-to-r from-transparent via-[#ffd875] to-transparent" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
