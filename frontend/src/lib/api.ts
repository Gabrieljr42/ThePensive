import type {
  ApiProblem,
  Corpus,
  EvidenceResponse,
  ExperimentRun,
  Mode,
  RunRequest,
} from "./contracts";

export class ArchiveError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ArchiveError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = await response.json().catch((error: unknown) => {
    if (options.signal?.aborted) throw error;
    return null;
  });
  if (!response.ok) {
    const problem = (data ?? {}) as Partial<ApiProblem>;
    throw new ArchiveError(
      problem.message ??
        "The archive could not complete this request. Please try again.",
      response.status,
    );
  }
  if (data === null)
    throw new ArchiveError(
      "The archive returned an unreadable response. Please try again.",
      response.status,
    );
  return data as T;
}

async function runRequest(
  path: string,
  options?: RequestInit,
): Promise<ExperimentRun> {
  const run = await request<ExperimentRun>(path, options);
  if (run.schema_version !== "1.0")
    throw new ArchiveError(
      "This archive version is not supported. Refresh and try again.",
      409,
    );
  return run;
}

export const archiveApi = {
  corpora: (signal?: AbortSignal) => request<Corpus[]>("/corpora", { signal }),
  preview: (corpusId: string, mode: Mode, signal?: AbortSignal) =>
    runRequest(`/demo?corpus_id=${encodeURIComponent(corpusId)}&mode=${mode}`, {
      signal,
    }),
  createRun: (body: RunRequest, signal?: AbortSignal) =>
    runRequest("/runs", { method: "POST", body: JSON.stringify(body), signal }),
  getRun: (id: string, signal?: AbortSignal) =>
    runRequest(`/runs/${encodeURIComponent(id)}`, { signal }),
  cancelRun: (id: string, signal?: AbortSignal) =>
    runRequest(`/runs/${encodeURIComponent(id)}/cancel`, {
      method: "POST",
      signal,
    }),
  evidence: (runId: string, citationId: string, signal?: AbortSignal) =>
    request<EvidenceResponse>(
      `/runs/${encodeURIComponent(runId)}/evidence/${encodeURIComponent(citationId)}`,
      { signal },
    ),
};
