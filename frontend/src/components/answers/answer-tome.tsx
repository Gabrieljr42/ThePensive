"use client";

import { motion } from "motion/react";
import type { Branch, EvidenceSelection, ExperimentRun } from "@/lib/contracts";
import { Icon } from "../icon";
import { RunMetrics } from "../metrics/run-metrics";

const statuses = {
  queued: "Waiting to open",
  preparing_context: "Preparing the context",
  generating: "Writing the answer",
  validating: "Checking the sources",
  complete: "Reading complete",
  failed: "Reading interrupted",
  cancelled: "Reading stopped",
};

export function AnswerTome({
  branch,
  run,
  activeCitation,
  onTrace,
  onOpen,
}: {
  branch: Branch;
  run: ExperimentRun;
  activeCitation: string | null;
  onTrace: (selection: EvidenceSelection | null) => void;
  onOpen: (selection: EvidenceSelection) => void;
}) {
  const rag = branch.method === "rag";
  const complete = branch.status === "complete";
  return (
    <motion.article
      initial={{ opacity: 0, y: 20, rotateY: rag ? -6 : 6, rotateX: 2 }}
      animate={{ opacity: 1, y: 0, rotateY: 0, rotateX: 0 }}
      transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
      className={`answer-tome ${rag ? "tome-brass" : "tome-moonlight"}`}
      aria-labelledby={`${branch.id}-heading`}
      aria-busy={
        !complete && branch.status !== "cancelled" && branch.status !== "failed"
      }
      data-testid={`tome-${branch.method}`}
    >
      <div className="tome-edge" aria-hidden="true" />
      <div className="tome-header">
        <div className="method-insignia">
          <Icon name={rag ? "book" : "moon"} />
        </div>
        <div>
          <span className="tome-eyebrow">
            {rag ? "THE FIRST TOME" : "THE SECOND TOME"}
          </span>
          <h3 id={`${branch.id}-heading`}>{rag ? "RAG" : "Full Context"}</h3>
          <p>{rag ? "The relevant leaves" : "The complete collection"}</p>
        </div>
        <span
          className={`branch-state ${complete ? "complete" : ""}`}
          data-testid="branch-status"
        >
          <span />
          {complete
            ? branch.insufficient_evidence
              ? "No prepared answer"
              : "Sources matched"
            : statuses[branch.status]}
        </span>
      </div>
      <div className="tome-rule" aria-hidden="true">
        <span>✦</span>
      </div>
      <div className="tome-body">
        {complete ? (
          <>
            <h4>{branch.answer_title}</h4>
            <p className="answer-introduction">{branch.introduction}</p>
            <div className="answer-claims">
              {branch.claims.map((claim, index) => (
                <motion.p
                  key={claim.id}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.38, delay: index * 0.07 }}
                  className={`answer-claim ${claim.citations.some((citation) => citation.id === activeCitation) ? "claim-illuminated" : ""}`}
                >
                  <span className="claim-index" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {claim.text}
                  {claim.citations.map((citation) => {
                    const source = run.sources.find(
                      (item) => item.id === citation.source_id,
                    );
                    if (!source) return null;
                    const selection = { branch, claim, citation, source };
                    return (
                      <button
                        key={citation.id}
                        className={`inline-citation ${activeCitation === citation.id ? "citation-active" : ""}`}
                        data-citation-id={citation.id}
                        aria-label={`Citation ${citation.number}: ${source.book_short}, ${source.chapter}, ${source.page_label}. View evidence.`}
                        aria-haspopup="dialog"
                        onMouseEnter={() => onTrace(selection)}
                        onMouseLeave={() => onTrace(null)}
                        onFocus={() => onTrace(selection)}
                        onBlur={() => onTrace(null)}
                        onClick={() => onOpen(selection)}
                      >
                        [{citation.number}]
                      </button>
                    );
                  })}
                </motion.p>
              ))}
            </div>
            <p className="answer-conclusion">{branch.conclusion}</p>
          </>
        ) : branch.status === "cancelled" || branch.status === "failed" ? (
          <div className="tome-empty">
            <Icon name="leaf" />
            <h4>{statuses[branch.status]}</h4>
            <p>
              {branch.error ??
                "Your question and collection are ready when you are."}
            </p>
          </div>
        ) : (
          <div className="tome-loading">
            <Icon name="spark" />
            <p>{statuses[branch.status]}…</p>
            <div className="ink-skeleton" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
        )}
      </div>
      <div className="tome-context">
        <details>
          <summary>
            <Icon name="leaf" />
            <span>{rag ? "Passages consulted" : "Context coverage"}</span>
            <span>
              {complete
                ? `${branch.context.supplied_source_count} / ${branch.context.selected_source_count}`
                : "—"}
            </span>
            <Icon name="chevron" />
          </summary>
          <div>
            <p>
              {branch.context.is_simulated
                ? rag
                  ? "Prepared retrieval example: selected passages from this collection."
                  : "Prepared full-context example: every passage in the selected collection."
                : rag
                  ? "Retrieved passages supplied to this answering method."
                  : "Every source passage in the declared scope was supplied to this method."}
            </p>
            {branch.context.source_ids.map((id) => {
              const source = run.sources.find((item) => item.id === id);
              return (
                source && (
                  <span className="context-source" key={id}>
                    {source.chapter}
                    <small>{source.page_label}</small>
                  </span>
                )
              );
            })}
          </div>
        </details>
      </div>
      <RunMetrics metrics={branch.metrics} />
    </motion.article>
  );
}
