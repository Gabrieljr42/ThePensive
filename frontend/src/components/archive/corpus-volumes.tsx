"use client";

import type { Corpus } from "@/lib/contracts";
import { ArchiveMark, Icon } from "../icon";

export function CorpusVolumes({
  corpora,
  selectedId,
  disabled,
  searching,
  onSelect,
}: {
  corpora: Corpus[];
  selectedId: string;
  disabled: boolean;
  searching: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="corpus-volumes" aria-labelledby="volumes-heading">
      <div className="object-caption">
        <span className="eyebrow">THE COLLECTIONS</span>
        <h2 id="volumes-heading">Choose a volume.</h2>
      </div>
      <div className="volume-rest">
        {corpora.map((corpus, index) => (
          <button
            key={corpus.id}
            className={`corpus-volume volume-${index % 2 === 0 ? "walnut" : "indigo"} ${searching && corpus.id === selectedId ? "volume-searching" : ""}`}
            data-corpus-object={corpus.id}
            aria-pressed={selectedId === corpus.id}
            aria-label={`Select ${corpus.title} collection. ${corpus.source_count} available source leaves.`}
            disabled={disabled}
            onClick={() => onSelect(corpus.id)}
          >
            <span className="volume-spine" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="volume-cover">
              <span className="volume-number">
                {["I", "II", "III", "IV", "V", "VI", "VII"][index] ?? index + 1}
              </span>
              <ArchiveMark />
              <strong>
                {corpus.id === "wizarding-notes" ? (
                  <>
                    The Wizarding
                    <br />
                    Companion
                  </>
                ) : (
                  corpus.title
                )}
              </strong>
              <span className="volume-title-caption">
                {corpus.id === "wizarding-notes"
                  ? "HARRY POTTER · ORIGINAL NOTES"
                  : "AN ORIGINAL ARCHIVE TALE"}
              </span>
              <span className="volume-engraving" aria-hidden="true">
                ◇
              </span>
              <span className="volume-availability">
                <Icon name="leaf" />
                {corpus.source_count} source leaves
              </span>
            </span>
            <span className="volume-page-edge" aria-hidden="true" />
          </button>
        ))}
      </div>
      <p className="volume-instruction">
        <span /> The illuminated volume is your corpus.
      </p>
    </aside>
  );
}
