import type { RunMetrics as Metrics } from "@/lib/contracts";

export function duration(value: number | null | undefined) {
  return value == null ? "—" : `${(value / 1000).toFixed(2)}s`;
}
export function tokens(value: number | null | undefined) {
  return value == null ? "—" : value.toLocaleString("en-US");
}
export function cost(value: number | null | undefined) {
  return value == null ? "—" : `$${value.toFixed(5)}`;
}

export function RunMetrics({ metrics }: { metrics: Metrics }) {
  return (
    <div
      className="tome-metrics"
      aria-label={`${metrics.basis === "illustrative" ? "Illustrative" : metrics.basis === "provider_reported" ? "Reported" : "Unavailable"} run metrics`}
    >
      <div>
        <span>Latency</span>
        <strong>{duration(metrics.latency_ms)}</strong>
      </div>
      <div>
        <span>
          Tokens <small>in / out</small>
        </span>
        <strong>
          {tokens(metrics.input_tokens)}{" "}
          <small>/ {tokens(metrics.output_tokens)}</small>
        </strong>
      </div>
      <div>
        <span>Est. API cost</span>
        <strong>{cost(metrics.estimated_cost_usd)}</strong>
      </div>
    </div>
  );
}
