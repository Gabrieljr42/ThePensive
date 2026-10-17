"use client";

import type { ArchiveBranch } from "../model";

interface GutterScaleProps {
  ragBranch?: ArchiveBranch;
  fullBranch?: ArchiveBranch;
}

export function GutterScale({ ragBranch, fullBranch }: GutterScaleProps) {
  if (!ragBranch || !fullBranch) return null;
  if (
    ragBranch.metrics.input_tokens == null ||
    fullBranch.metrics.input_tokens == null
  )
    return null;

  const ragTokens = ragBranch.metrics.input_tokens;
  const fullTokens = fullBranch.metrics.input_tokens;
  const ragLatency = ragBranch.metrics.latency_ms;
  const fullLatency = fullBranch.metrics.latency_ms;
  const ragSec = ragLatency == null ? "—" : (ragLatency / 1000).toFixed(2) + "s";
  const fullSec = fullLatency == null ? "—" : (fullLatency / 1000).toFixed(2) + "s";
  const ragPrice = ragBranch.metrics.estimated_cost_usd;
  const fullPrice = fullBranch.metrics.estimated_cost_usd;
  const ragCost = ragPrice == null ? "—" : "$" + ragPrice.toFixed(4);
  const fullCost = fullPrice == null ? "—" : "$" + fullPrice.toFixed(4);
  const costLabel = ragBranch.metrics.basis === "illustrative" ? "illustrative cost" : "estimated API cost";
  const ragLatencyShare =
    ragLatency == null || fullLatency == null ? null : (ragLatency / Math.max(1, ragLatency + fullLatency)) * 100;
  const ragTokenShare = (ragTokens / Math.max(1, ragTokens + fullTokens)) * 100;

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
          <span className="text-[#f5b041]">{ragSec}</span>
          <span className="text-[#556370]">/</span>
          <span className="text-[#88c4e0]">{fullSec}</span>
        </div>
        {ragLatencyShare != null && <div className="w-full h-1 bg-[#1a2330] rounded-full overflow-hidden flex">
          <div
            className="h-full bg-[#f5b041]"
            style={{ width: ragLatencyShare + "%" }}
          />
          <div
            className="h-full bg-[#88c4e0]"
            style={{ width: 100 - ragLatencyShare + "%" }}
          />
        </div>}
      </div>

      {/* Token Context Scale */}
      <div className="flex flex-col items-center gap-1.5 w-full my-3">
        <span className="text-[9px] uppercase text-[#6d7d8c]">TOKENS</span>
        <div className="flex items-center justify-between w-full px-1">
          <span className="text-[#f5b041]">
            {(ragTokens / 1000).toFixed(1)}k
          </span>
          <span className="text-[#556370]">/</span>
          <span className="text-[#88c4e0]">
            {Math.round(fullTokens / 1000)}k
          </span>
        </div>
        <div className="w-full h-1 bg-[#1a2330] rounded-full overflow-hidden flex">
          <div
            className="h-full bg-[#f5b041]"
            style={{ width: ragTokenShare + "%" }}
          />
          <div
            className="h-full bg-[#88c4e0]"
            style={{ width: 100 - ragTokenShare + "%" }}
          />
        </div>
        <span className="text-[8px] text-[#b5bfc4]">
          {ragTokens > 0
            ? "~" + Math.round(fullTokens / ragTokens) + "× context size"
            : "Context size"}
        </span>
      </div>

      {/* Cost Scale */}
      <div className="flex flex-col items-center gap-1.5 w-full my-3">
        <span className="text-[9px] uppercase text-[#6d7d8c]">EST. COST</span>
        <div className="flex items-center justify-between w-full px-1">
          <span className="text-[#f5b041]">{ragCost}</span>
          <span className="text-[#556370]">/</span>
          <span className="text-[#88c4e0]">{fullCost}</span>
        </div>
        <span className="text-[8px] text-[#b5bfc4]">
          {ragPrice != null && fullPrice != null && ragPrice > 0
            ? "~" + Math.round(fullPrice / ragPrice) + "× " + costLabel
            : costLabel}
        </span>
      </div>

      {/* Ground Truth Citation Count */}
      <div className="flex flex-col items-center gap-1 pt-2 border-t border-[#8a671d]/20 w-full">
        <span className="text-[9px] text-[#cda857]">EVIDENCE</span>
        <span className="text-[11px] text-[#f0e5ce]">
          <span className="text-[#f5b041]">{ragBranch.claims.length}</span> /{" "}
          <span className="text-[#88c4e0]">{fullBranch.claims.length}</span>{" "}
          Claims
        </span>
      </div>
    </div>
  );
}
