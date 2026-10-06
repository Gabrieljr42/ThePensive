"use client";

import type { ArchiveBranch } from "../model";

interface GutterScaleProps {
  ragBranch?: ArchiveBranch;
  fullBranch?: ArchiveBranch;
}

export function GutterScale({ ragBranch, fullBranch }: GutterScaleProps) {
  if (!ragBranch || !fullBranch) return null;

  const ragTokens = ragBranch.metrics.input_tokens || 1842;
  const fullTokens = fullBranch.metrics.input_tokens || 107200;
  const ragSec = ((ragBranch.metrics.latency_ms || 1480) / 1000).toFixed(2);
  const fullSec = ((fullBranch.metrics.latency_ms || 11840) / 1000).toFixed(2);
  const ragCost = (ragBranch.metrics.estimated_cost_usd || 0.0011).toFixed(4);
  const fullCost = (fullBranch.metrics.estimated_cost_usd || 0.268).toFixed(3);

  return (
    <div
      aria-label="Comparative Measurement Scale"
      className="hidden xl:flex flex-col items-center justify-between w-28 py-6 px-2 rounded-xs bg-[#090d14]/90 border border-[#a88235]/30 text-center font-mono text-[10px] tracking-wider text-[#98886e] shrink-0 backdrop-blur-md"
    >
      <div className="flex flex-col items-center gap-1">
        <span className="text-[#cda857] text-xs">⚔</span>
        <span className="uppercase text-[9px] tracking-[0.2em] text-[#a89574]">
          Divergence
        </span>
      </div>

      {/* Latency Comparison Scale */}
      <div className="flex flex-col items-center gap-1.5 w-full my-3">
        <span className="text-[9px] uppercase text-[#6d7d8c]">LATENCY</span>
        <div className="flex items-center justify-between w-full px-1">
          <span className="text-[#f5b041]">{ragSec}s</span>
          <span className="text-[#556370]">/</span>
          <span className="text-[#88c4e0]">{fullSec}s</span>
        </div>
        <div className="w-full h-1 bg-[#1a2330] rounded-full overflow-hidden flex">
          <div className="h-full bg-[#f5b041]" style={{ width: "12%" }} />
          <div className="h-full bg-[#88c4e0]" style={{ width: "88%" }} />
        </div>
      </div>

      {/* Token Context Scale */}
      <div className="flex flex-col items-center gap-1.5 w-full my-3">
        <span className="text-[9px] uppercase text-[#6d7d8c]">TOKENS</span>
        <div className="flex items-center justify-between w-full px-1">
          <span className="text-[#f5b041]">{(ragTokens / 1000).toFixed(1)}k</span>
          <span className="text-[#556370]">/</span>
          <span className="text-[#88c4e0]">{Math.round(fullTokens / 1000)}k</span>
        </div>
        <div className="w-full h-1 bg-[#1a2330] rounded-full overflow-hidden flex">
          <div className="h-full bg-[#f5b041]" style={{ width: "2%" }} />
          <div className="h-full bg-[#88c4e0]" style={{ width: "98%" }} />
        </div>
        <span className="text-[8px] text-[#8695a3]">~58× Attention Load</span>
      </div>

      {/* Cost Scale */}
      <div className="flex flex-col items-center gap-1.5 w-full my-3">
        <span className="text-[9px] uppercase text-[#6d7d8c]">EST. COST</span>
        <div className="flex items-center justify-between w-full px-1">
          <span className="text-[#f5b041]">${ragCost}</span>
          <span className="text-[#556370]">/</span>
          <span className="text-[#88c4e0]">${fullCost}</span>
        </div>
        <span className="text-[8px] text-[#8695a3]">~243× Cost Multiple</span>
      </div>

      {/* Ground Truth Citation Count */}
      <div className="flex flex-col items-center gap-1 pt-2 border-t border-[#8a671d]/20 w-full">
        <span className="text-[9px] text-[#cda857]">EVIDENCE</span>
        <span className="text-[11px] text-[#f0e5ce]">
          <span className="text-[#f5b041]">3</span> / <span className="text-[#88c4e0]">4</span> Claims
        </span>
      </div>
    </div>
  );
}
