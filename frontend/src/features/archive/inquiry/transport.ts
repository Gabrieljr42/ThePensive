import type { RunRequest, RunEstimate } from "@/lib/contracts";
import type { ArchiveRun, ArchiveBranch } from "../model";
import { mockArchiveAdapter } from "../mock/adapter";

export type InquiryUpdate = {
  run: ArchiveRun;
  connection: "connected" | "reconnecting";
};
export interface InquiryTransport {
  watch(
    request: RunRequest,
    volumes: string[],
    signal: AbortSignal,
  ): AsyncIterable<InquiryUpdate>;
}
export type DemoTiming = {
  rag: number;
  full_context: number;
  fail: "none" | "rag" | "full_context" | "both";
};
let labTiming: DemoTiming | null = null;
export function configureDemoTiming(timing: DemoTiming | null) {
  labTiming = timing;
}
export function abortableDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Inquiry cancelled", "AbortError"));
      return;
    }
    const abort = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      reject(new DOMException("Inquiry cancelled", "AbortError"));
    };
    const timer = setTimeout(
      () => {
        signal.removeEventListener("abort", abort);
        resolve();
      },
      Math.max(0, ms),
    );
    signal.addEventListener("abort", abort, { once: true });
  });
}
function pending(branch: ArchiveBranch): ArchiveBranch {
  return {
    ...branch,
    status: "queued",
    answer_title: "A memory taking shape",
    introduction: "",
    claims: [],
    conclusion: "",
    retrieval: undefined,
    context: {
      ...branch.context,
      source_ids: [],
      selected_source_count: 0,
      supplied_source_count: 0,
    },
    metrics: {
      basis: "illustrative",
      usage_status: "unknown",
      latency_ms: null,
      input_tokens: null,
      output_tokens: null,
      estimated_cost_usd: null,
    },
  };
}
/** Prepared demo stages are explicitly simulated; genuine transports provide their own snapshots. */
export const demoInquiryTransport: InquiryTransport = {
  async *watch(request, volumes, signal) {
    const final = await mockArchiveAdapter.createRun(request, volumes);
    if (signal.aborted) return;
    const timing = labTiming ?? { rag: 5200, full_context: 8400, fail: "none" };
    if (!final.sources.length && !labTiming) {
      yield { run: final, connection: "connected" };
      return;
    }
    let run: ArchiveRun = {
      ...final,
      status: "running",
      sources: [],
      branches: final.branches.map(pending),
    };
    yield { run, connection: "connected" };
    type Step = {
      at: number;
      method: ArchiveBranch["method"];
      phase: "preparing_context" | "generating" | "complete";
    };
    const steps: Step[] = final.branches
      .flatMap((branch) => {
        const delay = Math.max(0, Math.min(180000, timing[branch.method]));
        return [
          {
            at: Math.min(350, delay * 0.1),
            method: branch.method,
            phase: "preparing_context" as const,
          },
          {
            at: Math.min(1600, delay * 0.35),
            method: branch.method,
            phase: "generating" as const,
          },
          { at: delay, method: branch.method, phase: "complete" as const },
        ];
      })
      .sort((a, b) => a.at - b.at);
    const started = Date.now();
    for (const step of steps) {
      await abortableDelay(step.at - (Date.now() - started), signal);
      const original = final.branches.find(
        (branch) => branch.method === step.method,
      )!;
      const fail = timing.fail === "both" || timing.fail === step.method;
      const branch: ArchiveBranch =
        step.phase === "complete"
          ? fail
            ? {
                ...pending(original),
                status: "failed",
                error: "This method could not complete the inquiry. Try again.",
              }
            : original
          : {
              ...pending(original),
              status: step.phase,
              ...(step.phase === "generating"
                ? { context: original.context, retrieval: original.retrieval }
                : {}),
            };
      const branches = run.branches.map((item) =>
        item.method === step.method ? branch : item,
      );
      const done = branches.every((item) =>
        ["complete", "failed", "cancelled"].includes(item.status),
      );
      run = {
        ...run,
        branches,
        sources:
          step.phase === "generating" || step.phase === "complete"
            ? final.sources
            : run.sources,
        status: done
          ? branches.every((item) => item.status === "failed")
            ? "failed"
            : "complete"
          : "running",
      };
      yield { run, connection: "connected" };
    }
  },
};

/** Snapshot polling bridge for the existing API; no guessed progress or stages. */
export function createHttpInquiryTransport(base = "/api"): InquiryTransport {
  return {
    async *watch(request, volumes, signal) {
      const body = { ...request, idempotency_key: request.idempotency_key ?? crypto.randomUUID() };
      let runId: string | null = null;
      let terminal = false;
      const read = async (path: string, init: RequestInit = {}) => {
        const response = await fetch(base + path, {
          cache: "no-store",
          ...init,
          signal,
          headers: { "Content-Type": "application/json", ...init.headers },
        });
        if (!response.ok) {
          const problem = await response.json().catch(() => null);
          throw new Error(problem?.message ?? "The archive could not complete this inquiry.");
        }
        const run = (await response.json()) as ArchiveRun;
        if (!["1.0", "2.0"].includes(run.schema_version))
          throw new Error("Refresh the archive to use this response version.");
        return { ...run, scopeVolumeIds: run.scopeVolumeIds ?? volumes };
      };
      try {
        if (body.corpus_version.startsWith("pdf-")) {
          const response = await fetch(base + "/runs/estimate", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body), signal, cache: "no-store",
          });
          const estimate = (await response.json()) as RunEstimate & { message?: string };
          if (!response.ok) throw new Error(estimate.message ?? "The inquiry could not be checked.");
          const blocked = estimate.branches.find((branch) => !branch.eligible);
          if (blocked) throw new Error(blocked.reason ?? "Select a smaller scope.");
          if (!estimate.live_available) throw new Error("Live inquiries are not enabled.");
          if (estimate.maximum_cost_usd > estimate.available_budget_usd)
            throw new Error("The archive's remaining API budget is insufficient for this inquiry.");
        }
        let created: ArchiveRun | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            created = await read("/runs", { method: "POST", body: JSON.stringify(body) });
            break;
          } catch (error) {
            if (signal.aborted || attempt === 2 || !(error instanceof TypeError || error instanceof SyntaxError)) throw error;
            await abortableDelay(500 * (attempt + 1), signal);
          }
        }
        if (!created) throw new Error("The inquiry could not be created.");
        let run = created;
        runId = run.id;
        for (;;) {
          terminal = run.status !== "running";
          yield { run, connection: "connected" };
          if (terminal) return;
          await abortableDelay(650, signal);
          let recovered = false;
          for (let attempt = 0; attempt < 4; attempt++) {
            try {
              const snapshot = await read("/runs/" + encodeURIComponent(runId));
              if (snapshot.id !== runId)
                throw new Error("The archive returned a different inquiry.");
              run = snapshot;
              recovered = true;
              break;
            } catch (error) {
              if (signal.aborted) throw error;
              yield { run, connection: "reconnecting" };
              await abortableDelay(Math.min(4000, 750 * 2 ** attempt), signal);
            }
          }
          if (!recovered)
            throw new Error(
              "The connection to the archive was lost. Please try again.",
            );
        }
      } finally {
        if (signal.aborted && runId && !terminal) {
          // Cancelling the stream also asks the server to stop the run. Surface failures to the caller.
          const response = await fetch(
            base + "/runs/" + encodeURIComponent(runId) + "/cancel",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              keepalive: true,
            },
          );
          if (!response.ok)
            throw new Error(
              "The local inquiry stopped, but the server could not confirm cancellation.",
            );
        }
      }
    },
  };
}
let configuredTransport: InquiryTransport = demoInquiryTransport;
export function configureInquiryTransport(transport: InquiryTransport) {
  configuredTransport = transport;
}
export function getInquiryTransport() {
  return configuredTransport;
}
