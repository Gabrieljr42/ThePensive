import type { Corpus, EvidenceResponse, RunRequest } from "@/lib/contracts";
import type { ArchiveRun } from "../model";
import { ARCHIVE_VOLUMES } from "./volumes";
import {
  MARAUDERS_MAP_QUESTION,
  MARAUDERS_MAP_RUN,
  MARAUDERS_MAP_SOURCES,
} from "./marauders-map";

export const MOCK_CORPUS: Corpus = {
  id: "harry-potter-archive",
  version: "1997-2007-chronicles",
  title: "The Chronicles of Hogwarts",
  subtitle: "Seven enchanted tomes of magical history",
  edition: "Archival Demonstration Edition",
  source_kind: "ingested_edition",
  book_count: ARCHIVE_VOLUMES.length,
  source_count: ARCHIVE_VOLUMES.reduce((acc, v) => acc + v.chunks, 0),
  examples: [
    {
      id: "marauder",
      label: "The Marauder's Map",
      question: MARAUDERS_MAP_QUESTION,
    },
    {
      id: "mirror",
      label: "The Mirror of Erised",
      question: "What does the Mirror of Erised reveal, and why is it dangerous?",
    },
    {
      id: "stone",
      label: "The Philosopher's Stone",
      question: "Why can Harry retrieve the Philosopher's Stone from the mirror?",
    },
  ],
};

export const mockArchiveAdapter = {
  async getCorpus(): Promise<Corpus> {
    return MOCK_CORPUS;
  },

  async getVolumes() {
    return ARCHIVE_VOLUMES;
  },

  async createRun(req: RunRequest, selectedVolumes: string[] = ["vol-3"]): Promise<ArchiveRun> {
    const isMarauderQuestion =
      req.question.toLowerCase().includes("marauder") ||
      req.question.toLowerCase().includes("map") ||
      req.question.toLowerCase().includes("created") ||
      req.question.toLowerCase().includes("own") ||
      req.question.trim().length <= 3;

    if (isMarauderQuestion) {
      const branches =
        req.mode === "rag"
          ? [MARAUDERS_MAP_RUN.branches[0]]
          : req.mode === "full_context"
            ? [MARAUDERS_MAP_RUN.branches[1]]
            : MARAUDERS_MAP_RUN.branches;

      return {
        ...MARAUDERS_MAP_RUN,
        id: `run-${Date.now()}`,
        mode: req.mode,
        question: req.question.trim() || MARAUDERS_MAP_QUESTION,
        scopeVolumeIds: selectedVolumes.length > 0 ? selectedVolumes : ["vol-3"],
        branches,
      };
    }

    // Unprepared question fallback
    return {
      schema_version: "1.0",
      id: `run-${Date.now()}`,
      question: req.question,
      mode: req.mode,
      data_mode: "mock",
      is_preview: false,
      created_at: new Date().toISOString(),
      status: "complete",
      configuration: {
        corpus_id: "harry-potter-archive",
        corpus_version: "vol-3-poa",
        scope_label: "Custom Query Scope",
        model: "pensieve-dual-evaluator-v1",
        prompt_version: "v2.4-strict-provenance",
        output_limit: 800,
      },
      scopeVolumeIds: selectedVolumes,
      branches: [
        {
          id: `branch-unprepared-${Date.now()}`,
          method: "rag",
          status: "complete",
          answer_title: "Uncatalogued Inquiry",
          introduction:
            "This demonstration archive holds fully catalogued retrieval evidence for the prepared Marauder's Map investigation.",
          claims: [
            {
              id: "claim-unprep-1",
              text: "To observe the real-time retrieval ceremony, twin tomes, and claim-to-evidence thread, please consult the prepared Marauder's Map inquiry.",
              citations: [],
            },
          ],
          conclusion: "Return to the prepared inquiry on the research desk.",
          insufficient_evidence: true,
          context: {
            source_ids: [],
            selected_source_count: 0,
            supplied_source_count: 0,
            strategy: "retrieved_passages",
            is_simulated: true,
          },
          metrics: {
            basis: "illustrative",
            latency_ms: 320,
            input_tokens: 42,
            output_tokens: 45,
            estimated_cost_usd: 0.00003,
          },
        },
      ],
      sources: [],
    };
  },

  getEvidence(runId: string, citationId: string): EvidenceResponse | null {
    for (const branch of MARAUDERS_MAP_RUN.branches) {
      for (const claim of branch.claims) {
        for (const citation of claim.citations) {
          if (citation.id === citationId) {
            const source = MARAUDERS_MAP_SOURCES.find((s) => s.id === citation.source_id);
            if (source) {
              return {
                schema_version: "1.0",
                run_id: runId,
                branch_id: branch.id,
                claim,
                citation,
                source,
              };
            }
          }
        }
      }
    }
    return null;
  },
};
