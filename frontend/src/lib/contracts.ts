import type { components } from "./generated/api";

export type Corpus = components["schemas"]["Corpus"];
export type ExperimentRun = components["schemas"]["ExperimentRun"];
export type Branch = components["schemas"]["Branch"];
export type Claim = components["schemas"]["Claim"];
export type Citation = components["schemas"]["Citation"];
export type SourcePassage = components["schemas"]["SourcePassage"];
export type RunMetrics = components["schemas"]["RunMetrics"];
export type RunRequest = components["schemas"]["RunRequest"];
export type EvidenceResponse = components["schemas"]["EvidenceResponse"];
export type Mode = components["schemas"]["Mode"];
export type Method = components["schemas"]["Method"];
export type ApiProblem = components["schemas"]["ApiProblem"];

// UI selection state points at API objects; it never fabricates source metadata.
export type EvidenceSelection = {
  branch: Branch;
  claim: Claim;
  citation: Citation;
  source: SourcePassage;
};
