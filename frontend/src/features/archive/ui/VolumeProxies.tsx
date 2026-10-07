"use client";

import { useArchiveStore } from "../store";

export function VolumeProxies() {
  const phase = useArchiveStore((s) => s.phase);
  const volumes = useArchiveStore((s) => s.volumes);
  const selectedVolumeIds = useArchiveStore((s) => s.selectedVolumeIds);
  const hoveredVolumeId = useArchiveStore((s) => s.hoveredVolumeId);
  const toggleVolume = useArchiveStore((s) => s.toggleVolume);
  const isBusy = useArchiveStore((s) => s.isBusy);
  const setHoveredVolume = useArchiveStore((s) => s.setHoveredVolume);

  if (phase === "dark" || phase === "threshold" || phase === "approaching") {
    return null;
  }

  return (
    <aside aria-label="Archive Folio Selection" className="folio-selection">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px] font-mono tracking-widest text-[#a8997f] uppercase">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#cda857]" />
            Active Corpus ({selectedVolumeIds.length}/{volumes.length} Selected)
          </span>
          <span className="text-[10px] text-[#78848f] hidden sm:inline">
            Click book to summon
          </span>
        </div>

        {/* Desktop & Mobile Responsive Folio Strip */}
        <div className="folio-strip">
          {volumes.map((vol) => {
            const isSelected = selectedVolumeIds.includes(vol.id);
            const isHovered = hoveredVolumeId === vol.id;

            return (
              <button
                key={vol.id}
                type="button"
                role="button"
                aria-pressed={isSelected}
                disabled={isBusy}
                onClick={() => toggleVolume(vol.id)}
                onMouseEnter={() => setHoveredVolume(vol.id)}
                onMouseLeave={() => setHoveredVolume(null)}
                onFocus={() => setHoveredVolume(vol.id)}
                onBlur={() => setHoveredVolume(null)}
                className={`group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xs text-left transition-all duration-200 border whitespace-nowrap min-w-[210px] ${
                  isSelected
                    ? "bg-[#161c26]/90 border-[#cda857]/60 shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
                    : isHovered
                      ? "bg-[#111620]/80 border-[#8a7238]/40"
                      : "bg-[#0b0e14]/60 border-white/5 opacity-75 hover:opacity-100"
                }`}
              >
                {/* Book Spine Color Indicator */}
                <span
                  className="h-7 w-2.5 rounded-xs shadow-inner shrink-0"
                  style={{
                    backgroundColor: vol.leatherHex,
                    border: `1px solid ${vol.giltHex}60`,
                  }}
                />

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[#cda857]">
                      VOL. {vol.romanNumeral}
                    </span>
                    <span className="font-mono text-[9px] text-[#6e7d8c]">
                      {vol.year}
                    </span>
                  </div>
                  <span
                    className={`font-reading text-sm truncate leading-snug ${
                      isSelected
                        ? "text-[#f6edd8] font-medium"
                        : "text-[#c2b9a7]"
                    }`}
                  >
                    {vol.title}
                  </span>
                </div>

                {/* Metadata Badge */}
                <div className="ml-auto flex flex-col items-end text-right shrink-0">
                  <span className="font-mono text-[10px] text-[#9db2be]">
                    {vol.chunks.toLocaleString()} chk
                  </span>
                  <span className="font-mono text-[9px] text-[#5e6b77]">
                    {vol.pages} pp
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
