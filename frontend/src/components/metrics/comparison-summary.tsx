import type { ExperimentRun } from "@/lib/contracts";
import { duration, tokens } from "./run-metrics";

export function ComparisonSummary({ run }: { run: ExperimentRun }) {
  const rag = run.branches.find((branch) => branch.method === "rag");
  const full = run.branches.find((branch) => branch.method === "full_context");
  if (!rag || !full) return null;
  const countSources = (branch: typeof rag) =>
    branch.status === "complete"
      ? new Set(
          branch.claims.flatMap((claim) =>
            claim.citations.map((citation) => citation.source_id),
          ),
        ).size
      : "—";
  return (
    <div
      className="comparison-summary"
      aria-label={`${run.data_mode === "mock" ? "Illustrative" : "Recorded"} comparison summary`}
    >
      <span className="summary-label">
        ONE QUESTION.
        <br />
        <strong>TWO PERSPECTIVES.</strong>
      </span>
      <div>
        <span>Latency</span>
        <p>
          <b className="brass-text">{duration(rag.metrics.latency_ms)}</b>
          <span aria-label="compared with">/</span>
          <b className="moonlight-text">{duration(full.metrics.latency_ms)}</b>
        </p>
      </div>
      <div>
        <span>Input tokens</span>
        <p>
          <b className="brass-text">{tokens(rag.metrics.input_tokens)}</b>
          <span aria-label="compared with">/</span>
          <b className="moonlight-text">{tokens(full.metrics.input_tokens)}</b>
        </p>
      </div>
      <div>
        <span>Cited passages</span>
        <p>
          <b className="brass-text">{countSources(rag)}</b>
          <span aria-label="compared with">/</span>
          <b className="moonlight-text">{countSources(full)}</b>
        </p>
      </div>
      <span className="summary-footnote">
        {run.data_mode === "mock"
          ? "Illustrative comparison"
          : "Recorded comparison"}
        <br />
        RAG <i /> Full Context
      </span>
    </div>
  );
}
