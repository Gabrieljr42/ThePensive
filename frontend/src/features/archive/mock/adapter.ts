import type { Corpus, EvidenceResponse, RunRequest } from "@/lib/contracts";
import type { ArchiveBranch, ArchiveRun } from "../model";
import { ARCHIVE_VOLUMES } from "./volumes";
import { MARAUDERS_MAP_QUESTION, MARAUDERS_MAP_RUN } from "./marauders-map";
import { resolveRunEvidence } from "../presentation";

export const MOCK_CORPUS: Corpus = {
  id: "harry-potter-archive",
  version: "1997-2007-chronicles",
  title: "The Chronicles of Hogwarts",
  subtitle: "Seven enchanted tomes of magical history",
  edition: "Archival Demonstration Edition",
  source_kind: "ingested_edition",
  book_count: ARCHIVE_VOLUMES.length,
  source_count: ARCHIVE_VOLUMES.reduce((n, volume) => n + volume.chunks, 0),
  examples: [
    {
      id: "marauder",
      label: "The Marauder's Map",
      question: MARAUDERS_MAP_QUESTION,
    },
  ],
};
const history = new Map<string, ArchiveRun>();
let sequence = 0;
function remember(run: ArchiveRun) {
  history.set(run.id, run);
  if (history.size > 20) history.delete(history.keys().next().value!);
  return run;
}
export const mockArchiveAdapter = {
  async getCorpus() {
    return MOCK_CORPUS;
  },
  async getVolumes() {
    return ARCHIVE_VOLUMES;
  },
  async createRun(
    req: RunRequest,
    selectedVolumes: string[] = ["vol-3"],
  ): Promise<ArchiveRun> {
    const id = "run-" + Date.now() + "-" + ++sequence;
    const canonical = (question: string) =>
      question.trim().toLowerCase().replace(/[?!.]/g, "");
    const prepared =
      canonical(req.question) === canonical(MARAUDERS_MAP_QUESTION) &&
      selectedVolumes.includes("vol-3");
    const methods: ("rag" | "full_context")[] =
      req.mode === "compare" ? ["rag", "full_context"] : [req.mode];
    if (prepared)
      return remember({
        ...MARAUDERS_MAP_RUN,
        id,
        mode: req.mode,
        question: req.question.trim(),
        is_preview: false,
        data_mode: "mock",
        created_at: new Date().toISOString(),
        scopeVolumeIds: ["vol-3"],
        branches: MARAUDERS_MAP_RUN.branches
          .filter((branch) => methods.includes(branch.method))
          .map((branch) => ({
            ...branch,
            context: { ...branch.context, is_simulated: true },
            claims: branch.claims.map((claim) => ({
              ...claim,
              citations: claim.citations.map((citation) => {
                const source = MARAUDERS_MAP_RUN.sources.find(
                  (item) => item.id === citation.source_id,
                );
                const start = source?.text.indexOf(citation.excerpt) ?? -1;
                return start < 0
                  ? citation
                  : {
                      ...citation,
                      start_offset: start,
                      end_offset: start + citation.excerpt.length,
                    };
              }),
            })),
          })),
      });
    const introduction = selectedVolumes.includes("vol-3")
      ? "This archive demonstration contains a prepared investigation of the Marauder's Map. This question has no prepared answer."
      : "The prepared Marauder's Map investigation belongs to Volume III. Select The Prisoner of Azkaban to consult its evidence.";
    const branches: ArchiveBranch[] = methods.map((method) => ({
      id: id + "-" + method,
      method,
      status: "complete",
      answer_title: "Uncatalogued Inquiry",
      introduction,
      claims: [],
      conclusion:
        "Choose the Marauder's Map suggestion and Volume III to explore the prepared investigation.",
      insufficient_evidence: true,
      context: {
        source_ids: [],
        selected_source_count: 0,
        supplied_source_count: 0,
        strategy: method === "rag" ? "retrieved_passages" : "complete_scope",
        is_simulated: true,
      },
      metrics: {
        basis: "illustrative",
        latency_ms: null,
        input_tokens: null,
        output_tokens: null,
        estimated_cost_usd: null,
      },
    }));
    return remember({
      schema_version: "1.0",
      id,
      question: req.question,
      mode: req.mode,
      data_mode: "mock",
      is_preview: false,
      created_at: new Date().toISOString(),
      status: "complete",
      configuration: {
        corpus_id: req.corpus_id,
        corpus_version: req.corpus_version,
        scope_label: "Selected demonstration volumes",
        model: "prepared-demonstration",
        prompt_version: "v2.4-strict-provenance",
        output_limit: 800,
      },
      scopeVolumeIds: selectedVolumes,
      branches,
      sources: [],
    });
  },
  getEvidence(runId: string, citationId: string): EvidenceResponse | null {
    const run = history.get(runId);
    return run ? resolveRunEvidence(run, citationId) : null;
  },
};
