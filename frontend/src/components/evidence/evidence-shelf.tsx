"use client";

import type { EvidenceSelection, ExperimentRun, Mode } from "@/lib/contracts";
import { Icon } from "../icon";

export function evidenceSelections(
  run: ExperimentRun,
  mode: Mode,
): EvidenceSelection[] {
  return run.branches
    .filter((branch) => mode === "compare" || branch.method === mode)
    .flatMap((branch) =>
      branch.claims.flatMap((claim) =>
        claim.citations.flatMap((citation) => {
          const source = run.sources.find(
            (item) => item.id === citation.source_id,
          );
          return source ? [{ branch, claim, citation, source }] : [];
        }),
      ),
    );
}

export function EvidenceShelf({
  run,
  mode,
  activeSource,
  onOpen,
  onTrace,
}: {
  run: ExperimentRun;
  mode: Mode;
  activeSource: string | null;
  onOpen: (selection: EvidenceSelection) => void;
  onTrace: (selection: EvidenceSelection | null) => void;
}) {
  const selections = evidenceSelections(run, mode);
  const unique = selections.filter(
    (item, index) =>
      selections.findIndex((other) => other.source.id === item.source.id) ===
      index,
  );
  if (!unique.length) return null;
  return (
    <section
      className="evidence-shelf"
      id="evidence"
      aria-labelledby="evidence-heading"
    >
      <div className="shelf-heading">
        <div>
          <span className="eyebrow">FOLLOW THE THREAD</span>
          <h2 id="evidence-heading">The source leaves</h2>
        </div>
        <p>
          {unique.length} cited passages <span>·</span>{" "}
          {run.data_mode === "mock"
            ? "Original demo sources"
            : "Edition-specific sources"}
        </p>
      </div>
      <div className="source-leaves">
        {unique.map((selection, index) => (
          <button
            key={selection.source.id}
            className={`source-leaf ${activeSource === selection.source.id ? "leaf-illuminated" : ""}`}
            data-source-id={selection.source.id}
            onClick={() => onOpen(selection)}
            onMouseEnter={() => onTrace(selection)}
            onMouseLeave={() => onTrace(null)}
            onFocus={() => onTrace(selection)}
            onBlur={() => onTrace(null)}
            aria-haspopup="dialog"
          >
            <span className="leaf-number">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="leaf-content">
              <small>{selection.source.book_short}</small>
              <strong>{selection.source.chapter}</strong>
              <span>
                {selection.source.page_label}
                <i />
                View passage <Icon name="arrow" />
              </span>
            </span>
            <Icon className="leaf-emblem" name="leaf" />
          </button>
        ))}
      </div>
    </section>
  );
}
