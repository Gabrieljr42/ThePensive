"use client";

import { useState } from "react";
import type { EvidenceSelection, ExperimentRun, Mode } from "@/lib/contracts";
import { evidenceSelections } from "./evidence-shelf";
import { Icon } from "../icon";

export function EvidenceConstellation({
  run,
  mode,
  onOpen,
  onTrace,
}: {
  run: ExperimentRun;
  mode: Mode;
  onOpen: (selection: EvidenceSelection) => void;
  onTrace: (selection: EvidenceSelection | null) => void;
}) {
  const [hover, setHover] = useState<{
    claimId?: string;
    sourceId?: string;
  } | null>(null);
  const selections = evidenceSelections(run, mode);
  const claims = selections.filter(
    (item, index) =>
      selections.findIndex((other) => other.claim.id === item.claim.id) ===
      index,
  );
  const sources = selections.filter(
    (item, index) =>
      selections.findIndex((other) => other.source.id === item.source.id) ===
      index,
  );
  const height = Math.max(360, claims.length * 66 + 70);
  const claimY = (index: number) =>
    40 + ((index + 0.5) * (height - 80)) / claims.length;
  const sourceY = (index: number) =>
    40 + ((index + 0.5) * (height - 80)) / sources.length;
  const linked = (selection: EvidenceSelection) =>
    !hover ||
    hover.claimId === selection.claim.id ||
    hover.sourceId === selection.source.id;
  function highlight(selection: EvidenceSelection, source: boolean) {
    setHover(
      source
        ? { sourceId: selection.source.id }
        : { claimId: selection.claim.id },
    );
    onTrace(selection);
  }
  function release() {
    setHover(null);
    onTrace(null);
  }
  if (!claims.length) return null;
  return (
    <section
      className="evidence-constellation"
      aria-label="Evidence constellation"
    >
      <div className="constellation-heading">
        <Icon name="spark" />
        <p>
          Every light is a stored relationship.
          <span>
            Hover or focus a claim or source to follow its connections.
          </span>
        </p>
      </div>
      <div
        className="constellation-space"
        style={{ height }}
        data-focusing={!!hover}
      >
        <svg
          className="constellation-lines"
          viewBox={`0 0 1000 ${height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {claims.map((selection, index) => (
            <path
              key={`question-${selection.claim.id}`}
              className={`question-orbit ${linked(selection) ? "orbit-lit" : ""}`}
              d={`M150 ${height * 0.5} C 285 ${height * 0.5}, 365 ${claimY(index)}, 495 ${claimY(index)}`}
            />
          ))}
          {selections.map((selection) => {
            const ci = claims.findIndex(
              (item) => item.claim.id === selection.claim.id,
            );
            const si = sources.findIndex(
              (item) => item.source.id === selection.source.id,
            );
            return (
              <path
                key={`${selection.claim.id}-${selection.citation.id}`}
                className={`source-orbit ${selection.branch.method === "rag" ? "orbit-brass" : "orbit-moonlight"} ${linked(selection) ? "orbit-lit" : ""}`}
                d={`M495 ${claimY(ci)} C 630 ${claimY(ci)}, 715 ${sourceY(si)}, 855 ${sourceY(si)}`}
              />
            );
          })}
        </svg>
        <div className="constellation-question" style={{ top: height * 0.5 }}>
          <span>THE QUESTION</span>
          <Icon name="spark" />
          <p>{run.question}</p>
        </div>
        <div className="constellation-claims" aria-label="Answer claims">
          {claims.map((selection, index) => (
            <div
              className={`constellation-claim-node ${selection.branch.method === "rag" ? "node-brass" : "node-moonlight"} ${hover && !selections.some((item) => item.claim.id === selection.claim.id && linked(item)) ? "node-dimmed" : ""}`}
              key={selection.claim.id}
              style={{ top: claimY(index) }}
            >
              <button
                aria-label={`${selection.branch.method === "rag" ? "RAG" : "Full Context"} claim ${selection.citation.number}: ${selection.claim.text} View evidence.`}
                onMouseEnter={() => highlight(selection, false)}
                onMouseLeave={release}
                onFocus={() => highlight(selection, false)}
                onBlur={release}
                onClick={() => onOpen(selection)}
              >
                <span className="node-star" aria-hidden="true">
                  ✦
                </span>
                <span>
                  <small>
                    {selection.branch.method === "rag" ? "RAG" : "FULL CONTEXT"}{" "}
                    <i /> CLAIM {selection.citation.number}
                  </small>
                  <strong>
                    {selection.claim.text.length > 65
                      ? `${selection.claim.text.slice(0, 65)}…`
                      : selection.claim.text}
                  </strong>
                </span>
              </button>
              <div className="mobile-node-sources">
                {selections
                  .filter((item) => item.claim.id === selection.claim.id)
                  .map((item) => (
                    <button key={item.citation.id} onClick={() => onOpen(item)}>
                      {item.source.page_label}
                      <Icon name="arrow" />
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
        <div
          className="constellation-sources"
          aria-label="Cited source passages"
        >
          {sources.map((selection, index) => (
            <button
              key={selection.source.id}
              className={`constellation-source-node ${hover && !selections.some((item) => item.source.id === selection.source.id && linked(item)) ? "node-dimmed" : ""}`}
              style={{ top: sourceY(index) }}
              data-source-id={selection.source.id}
              aria-label={`${selection.source.chapter}, ${selection.source.page_label}. View source passage.`}
              onMouseEnter={() => highlight(selection, true)}
              onMouseLeave={release}
              onFocus={() => highlight(selection, true)}
              onBlur={release}
              onClick={() => onOpen(selection)}
            >
              <span className="node-star" aria-hidden="true">
                ✦
              </span>
              <small>{selection.source.book_short}</small>
              <strong>{selection.source.chapter}</strong>
              <span>{selection.source.page_label}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="constellation-provenance">
        {claims.length} claims <i /> {sources.length} source leaves <i />{" "}
        {selections.length} citation links{" "}
        <span>
          From this {run.data_mode === "mock" ? "prepared" : "recorded"}{" "}
          experiment.
        </span>
      </p>
    </section>
  );
}
