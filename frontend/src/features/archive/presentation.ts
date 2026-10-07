import type { ArchiveRun, RetrievalCandidate } from "./model";

export interface MemoryNode {
  id: string;
  sourceId: string;
  volumeId: string;
  selected: boolean;
  position: [number, number, number];
}

export function memoryPosition(index: number): [number, number, number] {
  const side = index % 2 === 0 ? -1 : 1;
  const row = Math.floor(index / 2);
  return [
    side * (2.5 + (row % 2) * 0.28),
    1.4 + (row % 4) * 0.56,
    -1.3 - row * 0.35,
  ];
}

export function presentMemories(run: ArchiveRun | null): MemoryNode[] {
  if (!run) return [];
  const rag = run.branches.find((branch) => branch.method === "rag");
  const candidates: RetrievalCandidate[] = rag?.retrieval?.candidates ?? [];
  const supplied = new Set(rag?.context.source_ids ?? []);
  return candidates.slice(0, 12).map((candidate, index) => ({
    id: candidate.chunkId,
    sourceId: candidate.sourceId,
    volumeId: candidate.volumeId,
    selected: supplied.has(candidate.sourceId) && candidate.rank !== null,
    position: memoryPosition(index),
  }));
}

export function resolveRunEvidence(run: ArchiveRun, citationId: string) {
  for (const branch of run.branches) {
    for (const claim of branch.claims) {
      const citation = claim.citations.find((item) => item.id === citationId);
      if (!citation) continue;
      const source = run.sources.find((item) => item.id === citation.source_id);
      if (source)
        return {
          schema_version: run.schema_version,
          run_id: run.id,
          branch_id: branch.id,
          claim,
          citation,
          source,
        };
    }
  }
  return null;
}
