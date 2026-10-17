"use client";
import { useEffect, useState } from "react";
import { useArchiveStore } from "../store";
import type { ArchiveBranch } from "../model";

export function branchStatus(branch: ArchiveBranch) {
  if (branch.status === "failed") return "Could not complete";
  if (branch.status === "cancelled") return "Cancelled";
  if (branch.status === "complete") return "Ready to read";
  if (branch.status === "validating") return "Checking the answer";
  if (branch.status === "generating") return "Composing the answer";
  if (branch.status === "preparing_context")
    return branch.method === "rag"
      ? "Preparing passage search"
      : "Assembling the selected scope";
  return "Waiting to begin";
}
export function useInquiryElapsed() {
  const started = useArchiveStore((s) => s.inquiryStartedAt);
  const busy = useArchiveStore((s) => s.isBusy);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!busy) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [busy, started]);
  return started ? Math.max(0, Math.floor((now - started) / 1000)) : 0;
}
export function InquiryStatus() {
  const run = useArchiveStore((s) => s.run);
  const busy = useArchiveStore((s) => s.isBusy);
  const connection = useArchiveStore((s) => s.connection);
  const elapsed = useInquiryElapsed();
  if (!busy) return null;
  return (
    <div className="inquiry-progress" aria-label="Inquiry progress">
      <div className="inquiry-progress-heading">
        <span>
          {connection === "reconnecting"
            ? "Reconnecting to the archive…"
            : run?.data_mode === "mock"
              ? "Prepared demonstration · simulated wait"
              : "Consulting the archive"}
        </span>
        <span aria-label="Time elapsed">{elapsed}s elapsed</span>
      </div>
      <div className="inquiry-progress-methods" role="status">
        {run?.branches.map((branch) => (
          <span key={branch.id} data-method={branch.method}>
            <strong>
              {branch.method === "rag" ? "✦ RAG" : "☾ Full Context"}
            </strong>{" "}
            {branchStatus(branch)}
          </span>
        ))}
      </div>
    </div>
  );
}
