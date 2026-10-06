import type { Branch, ExperimentRun } from "@/lib/contracts";

export interface Volume {
  id: string;
  ordinal: number;
  romanNumeral: string;
  title: string;
  short: string;
  year: number;
  pages: number;
  chapters: number;
  chunks: number;
  tokens: number;
  indexing: "indexed" | "pending";
  leatherHex: string;
  giltHex: string;
  description: string;
}

export interface RetrievalCandidate {
  chunkId: string;
  sourceId: string;
  volumeId: string;
  bookTitle: string;
  chapterTitle: string;
  chapterNumber: number;
  pageLabel: string;
  similarity: number;
  rerankScore: number;
  rank: number | null; // null if pruned during reranking (e.g. 8 down to 3)
  shelfCoords: {
    aisle: number;
    row: number;
    slot: number;
  };
  excerpt: string;
}

export interface RetrievalTrace {
  candidates: RetrievalCandidate[];
  retrievedChunkIds: string[];
  reranker: string;
  embeddingModel: string;
  topK: number;
}

export interface ArchiveBranch extends Branch {
  retrieval?: RetrievalTrace;
}

export interface ArchiveRun extends Omit<ExperimentRun, "branches"> {
  branches: ArchiveBranch[];
  scopeVolumeIds: string[];
}

export type ScenePhase =
  | "dark"
  | "threshold"
  | "approaching"
  | "desk"
  | "casting"
  | "retrieving"
  | "reading"
  | "evidence";
