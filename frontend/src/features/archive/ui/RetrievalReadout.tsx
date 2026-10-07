"use client";
import { useArchiveStore } from "../store";
import { branchStatus } from "./InquiryStatus";

export function RetrievalReadout() {
  const run = useArchiveStore((s) => s.run);
  const phase = useArchiveStore((s) => s.phase);
  if (!run || !["reading", "evidence"].includes(phase)) return null;
  return (
    <div className="retrieval-readout" aria-live="polite">
      <span className="readout-label">
        Memories consulted <span>· illustrative measurements</span>
      </span>
      <div className="readout-branches">
        {run.branches.map((branch) => (
          <p key={branch.id} data-method={branch.method}>
            <strong>
              {branch.method === "rag" ? "✦ RAG" : "☾ Full Context"}
            </strong>
            <span>
              {branch.method === "rag"
                ? (branch.retrieval?.candidates.length ?? 0) +
                  " candidates → " +
                  branch.context.selected_source_count +
                  " selected passages"
                : branch.status !== "complete"
                  ? branchStatus(branch)
                  : branch.context.supplied_source_count > 0
                    ? "Prepared Volume III scope"
                    : "No prepared evidence in this scope"}
            </span>
            <span>
              {branch.metrics.input_tokens?.toLocaleString() ?? "—"} tokens
            </span>
            <span>
              {branch.metrics.latency_ms == null
                ? "—"
                : (branch.metrics.latency_ms / 1000).toFixed(2) + "s"}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}
