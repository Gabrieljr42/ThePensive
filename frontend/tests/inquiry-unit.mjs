import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

// Exercise the real store and adapter without a browser or a new test dependency.
const load = createRequire(import.meta.url);
const original = load.extensions[".ts"];
load.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(outputText, filename);
};
try {
  const { useArchiveStore } = load("../src/features/archive/store.ts");
  const { mockArchiveAdapter } = load(
    "../src/features/archive/mock/adapter.ts",
  );
  const { MARAUDERS_MAP_QUESTION } = load(
    "../src/features/archive/mock/marauders-map.ts",
  );
  const { presentMemories, resolveRunEvidence } = load(
    "../src/features/archive/presentation.ts",
  );
  const request = {
    question: MARAUDERS_MAP_QUESTION,
    mode: "compare",
    corpus_id: "harry-potter-archive",
    corpus_version: "vol-3-poa",
  };
  const prepared = await mockArchiveAdapter.createRun(request, ["vol-3"]);
  const s = () => useArchiveStore.getState();
  const first = s().beginInquiry();
  const second = s().beginInquiry();
  assert.equal(
    s().completeInquiry(first, prepared),
    false,
    "an old response must not replace the current inquiry",
  );
  assert.equal(s().run, null);
  s().failInquiry(first, "late failure");
  assert.equal(
    s().error,
    null,
    "an old failure must not affect the current inquiry",
  );
  assert.equal(s().completeInquiry(second, prepared), true);
  assert.equal(s().phase, "reading");
  const third = s().beginInquiry();
  s().cancelInquiry();
  assert.equal(
    s().completeInquiry(third, prepared),
    false,
    "cancelled data must stay discarded",
  );
  assert.equal(s().phase, "desk");
  const fourth = s().beginInquiry();
  s().failInquiry(fourth, "temporary failure");
  assert.equal(s().isBusy, false);
  assert.equal(s().error, "temporary failure");
  assert.equal(
    presentMemories(prepared).filter((node) => node.selected).length,
    3,
  );
  const shortened = structuredClone(prepared);
  shortened.branches[0].retrieval.candidates =
    shortened.branches[0].retrieval.candidates.slice(0, 2);
  shortened.branches[0].context.source_ids = [
    shortened.branches[0].retrieval.candidates[1].sourceId,
  ];
  assert.equal(presentMemories(shortened).length, 2);
  assert.equal(
    presentMemories(shortened).filter((node) => node.selected).length,
    1,
    "trace data controls the scene",
  );
  const evidence = resolveRunEvidence(prepared, "cit-rag-1");
  assert.ok(evidence);
  assert.equal(
    evidence.source.text.slice(
      evidence.citation.start_offset,
      evidence.citation.end_offset,
    ),
    evidence.citation.excerpt,
  );
  assert.equal(resolveRunEvidence(prepared, "unknown"), null);
  assert.equal(
    mockArchiveAdapter.getEvidence("unknown-run", "cit-rag-1"),
    null,
  );
  const unsupported = await mockArchiveAdapter.createRun(
    { ...request, question: "What colour is the map?" },
    ["vol-3"],
  );
  assert.equal(unsupported.sources.length, 0);
  assert.equal(unsupported.branches.length, 2);
  assert.ok(
    unsupported.branches.every(
      (branch) => branch.metrics.input_tokens === null,
    ),
  );
  const wrongScope = await mockArchiveAdapter.createRun(request, ["vol-1"]);
  assert.equal(
    wrongScope.sources.length,
    0,
    "an unselected volume must not provide evidence",
  );
  const full = await mockArchiveAdapter.createRun(
    { ...request, mode: "full_context", question: "Unknown inquiry" },
    ["vol-3"],
  );
  assert.equal(full.branches[0].method, "full_context");
  console.log(
    "Inquiry lifecycle, cancellation, stale responses, trace-driven memories, scoped evidence and unsupported modes: passed.",
  );
} finally {
  load.extensions[".ts"] = original;
}
