import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

// Configure module loader for TS transpilation in node
const load = createRequire(import.meta.url);
const threeModule = await import("three");
const resolvedThree = load.resolve("three");
load.cache[resolvedThree] = {
  id: resolvedThree,
  filename: resolvedThree,
  loaded: true,
  exports: threeModule,
};

const original = load.extensions[".ts"];
const originalTsx = load.extensions[".tsx"];
load.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  });
  module._compile(outputText, filename);
};
load.extensions[".tsx"] = load.extensions[".ts"];

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, fn) {
  try {
    process.stdout.write(`[RUNNING] ${name}... `);
    fn();
    console.log("PASS");
    testsPassed++;
  } catch (err) {
    console.log("FAIL");
    console.error(`  Error in ${name}:`, err);
    testsFailed++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    process.stdout.write(`[RUNNING] ${name}... `);
    await fn();
    console.log("PASS");
    testsPassed++;
  } catch (err) {
    console.log("FAIL");
    console.error(`  Error in ${name}:`, err);
    testsFailed++;
  }
}

console.log("=== ADVERSARIAL STRESS HARNESS: FEATURE F3 ===");

try {
  const { useArchiveStore } = load("../src/features/archive/store.ts");
  const { mockArchiveAdapter, MOCK_CORPUS } = load(
    "../src/features/archive/mock/adapter.ts",
  );
  const { MARAUDERS_MAP_QUESTION } = load(
    "../src/features/archive/mock/marauders-map.ts",
  );
  const { MIRROR_OF_ERISED_QUESTION } = load(
    "../src/features/archive/mock/mirror-of-erised.ts",
  );
  const { PHILOSOPHERS_STONE_QUESTION } = load(
    "../src/features/archive/mock/philosophers-stone.ts",
  );
  const { resolveRunEvidence } = load(
    "../src/features/archive/presentation.ts",
  );
  const {
    demoInquiryTransport,
    configureDemoTiming,
  } = load("../src/features/archive/inquiry/transport.ts");

  // --------------------------------------------------------------------------
  // TEST SUITE F3.1: Suggestion Pill Definitions & Corpus Metadata
  // --------------------------------------------------------------------------
  runTest("F3.1: MOCK_CORPUS contains all 3 catalogued curiosity examples", () => {
    assert.equal(MOCK_CORPUS.examples.length, 3);
    const ids = MOCK_CORPUS.examples.map((e) => e.id);
    assert.deepEqual(ids, ["marauder", "mirror", "stone"]);
    assert.equal(MOCK_CORPUS.examples[0].question, MARAUDERS_MAP_QUESTION);
    assert.equal(MOCK_CORPUS.examples[1].question, MIRROR_OF_ERISED_QUESTION);
    assert.equal(MOCK_CORPUS.examples[2].question, PHILOSOPHERS_STONE_QUESTION);
  });

  // --------------------------------------------------------------------------
  // TEST SUITE F3.2: Store Interaction & Volume Auto-Switching Logic
  // --------------------------------------------------------------------------
  runTest("F3.2a: Clicking Pill 2 ('Mirror of Erised') auto-selects vol-1 from default vol-3", () => {
    const store = useArchiveStore.getState();
    // Reset to initial store default
    store.selectSingleVolume("vol-3");
    store.setQuestion(MARAUDERS_MAP_QUESTION);

    assert.deepEqual(useArchiveStore.getState().selectedVolumeIds, ["vol-3"]);

    // Simulate clicking suggestion pill 2 (logic from QuestionLeaf.tsx:125-130)
    const pill = {
      label: "The Mirror of Erised",
      q: MIRROR_OF_ERISED_QUESTION,
      volumeId: "vol-1",
    };
    useArchiveStore.getState().setQuestion(pill.q);
    if (!useArchiveStore.getState().selectedVolumeIds.includes(pill.volumeId)) {
      useArchiveStore.getState().selectSingleVolume(pill.volumeId);
    }

    const stateAfter = useArchiveStore.getState();
    assert.equal(stateAfter.question, MIRROR_OF_ERISED_QUESTION);
    assert.deepEqual(stateAfter.selectedVolumeIds, ["vol-1"]);
    assert.equal(stateAfter.isCustomQuestion, false);
  });

  runTest("F3.2b: Clicking Pill 3 ('Philosopher's Stone') auto-selects vol-1", () => {
    const store = useArchiveStore.getState();
    store.selectSingleVolume("vol-3");

    const pill = {
      label: "The Philosopher's Stone",
      q: PHILOSOPHERS_STONE_QUESTION,
      volumeId: "vol-1",
    };
    useArchiveStore.getState().setQuestion(pill.q);
    if (!useArchiveStore.getState().selectedVolumeIds.includes(pill.volumeId)) {
      useArchiveStore.getState().selectSingleVolume(pill.volumeId);
    }

    const stateAfter = useArchiveStore.getState();
    assert.equal(stateAfter.question, PHILOSOPHERS_STONE_QUESTION);
    assert.deepEqual(stateAfter.selectedVolumeIds, ["vol-1"]);
    assert.equal(stateAfter.isCustomQuestion, false);
  });

  runTest("F3.2c: Clicking Pill 1 ('Marauder's Map') auto-selects vol-3 from vol-1", () => {
    const store = useArchiveStore.getState();
    store.selectSingleVolume("vol-1");

    const pill = {
      label: "The Marauder's Map",
      q: MARAUDERS_MAP_QUESTION,
      volumeId: "vol-3",
    };
    useArchiveStore.getState().setQuestion(pill.q);
    if (!useArchiveStore.getState().selectedVolumeIds.includes(pill.volumeId)) {
      useArchiveStore.getState().selectSingleVolume(pill.volumeId);
    }

    const stateAfter = useArchiveStore.getState();
    assert.equal(stateAfter.question, MARAUDERS_MAP_QUESTION);
    assert.deepEqual(stateAfter.selectedVolumeIds, ["vol-3"]);
    assert.equal(stateAfter.isCustomQuestion, false);
  });

  // --------------------------------------------------------------------------
  // TEST SUITE F3.3: Streaming Response Lifecycle for All 3 Pills
  // --------------------------------------------------------------------------
  const pillScenarios = [
    {
      name: "Marauder's Map",
      question: MARAUDERS_MAP_QUESTION,
      volumeId: "vol-3",
      expectedSourceCount: 4,
      ragClaims: 3,
      fullClaims: 4,
    },
    {
      name: "Mirror of Erised",
      question: MIRROR_OF_ERISED_QUESTION,
      volumeId: "vol-1",
      expectedSourceCount: 3,
      ragClaims: 2,
      fullClaims: 3,
    },
    {
      name: "Philosopher's Stone",
      question: PHILOSOPHERS_STONE_QUESTION,
      volumeId: "vol-1",
      expectedSourceCount: 3,
      ragClaims: 2,
      fullClaims: 3,
    },
  ];

  for (const scenario of pillScenarios) {
    await runAsyncTest(
      `F3.3 [${scenario.name}]: Streaming produces progressive branches and complete final snapshot`,
      async () => {
        configureDemoTiming({ rag: 50, full_context: 80, fail: "none" });
        try {
          const req = {
            question: scenario.question,
            mode: "compare",
            corpus_id: "harry-potter-archive",
            corpus_version: scenario.volumeId === "vol-1" ? "vol-1-ps" : "vol-3-poa",
          };

          const updates = [];
          for await (const update of demoInquiryTransport.watch(
            req,
            [scenario.volumeId],
            new AbortController().signal,
          )) {
            updates.push(update);
          }

          // Must emit at least 3 progressive stages: initial running, rag complete, both complete
          assert.ok(
            updates.length >= 3,
            `Expected >= 3 streaming updates, got ${updates.length}`,
          );

          // Initial snapshot check
          const initial = updates[0].run;
          assert.equal(initial.status, "running");
          assert.equal(initial.branches[0].status, "queued");
          assert.equal(initial.branches[1].status, "queued");

          // Final snapshot check
          const final = updates.at(-1).run;
          assert.equal(final.status, "complete");
          assert.equal(final.sources.length, scenario.expectedSourceCount);
          assert.equal(final.branches.length, 2);

          const ragBranch = final.branches.find((b) => b.method === "rag");
          const fullBranch = final.branches.find((b) => b.method === "full_context");
          assert.ok(ragBranch && ragBranch.status === "complete");
          assert.ok(fullBranch && fullBranch.status === "complete");
          assert.equal(ragBranch.claims.length, scenario.ragClaims);
          assert.equal(fullBranch.claims.length, scenario.fullClaims);

          // Metrics check
          assert.ok(ragBranch.metrics.latency_ms > 0);
          assert.ok(ragBranch.metrics.input_tokens > 0);
          assert.ok(fullBranch.metrics.latency_ms > 0);
          assert.ok(fullBranch.metrics.input_tokens > 0);
        } finally {
          configureDemoTiming(null);
        }
      },
    );
  }

  // --------------------------------------------------------------------------
  // TEST SUITE F3.4: Evidence Cards & Verbatim Substring Exactness
  // --------------------------------------------------------------------------
  for (const scenario of pillScenarios) {
    await runAsyncTest(
      `F3.4 [${scenario.name}]: All evidence cards and citations match verbatim source text`,
      async () => {
        const req = {
          question: scenario.question,
          mode: "compare",
          corpus_id: "harry-potter-archive",
          corpus_version: scenario.volumeId === "vol-1" ? "vol-1-ps" : "vol-3-poa",
        };
        const run = await mockArchiveAdapter.createRun(req, [scenario.volumeId]);

        let totalCitations = 0;
        for (const branch of run.branches) {
          for (const claim of branch.claims) {
            for (const cit of claim.citations) {
              totalCitations++;
              // 1. Evidence lookup via presentation.resolveRunEvidence
              const resolved = resolveRunEvidence(run, cit.id);
              assert.ok(
                resolved,
                `Citation ${cit.id} must resolve in presentation layer`,
              );
              assert.equal(resolved.citation.id, cit.id);
              assert.equal(resolved.claim.id, claim.id);
              assert.equal(resolved.source.id, cit.source_id);

              // 2. Evidence lookup via adapter.getEvidence
              const adapterEvidence = mockArchiveAdapter.getEvidence(
                run.id,
                cit.id,
              );
              assert.ok(
                adapterEvidence,
                `Citation ${cit.id} must resolve via adapter.getEvidence`,
              );

              // 3. Verbatim substring offset integrity
              const source = run.sources.find((s) => s.id === cit.source_id);
              assert.ok(source, `Source ${cit.source_id} must exist in run`);

              const sliced = source.text.slice(
                cit.start_offset,
                cit.end_offset,
              );
              assert.equal(
                sliced,
                cit.excerpt,
                `Citation ${cit.id} excerpt must match source text at [${cit.start_offset}:${cit.end_offset}] verbatim`,
              );
            }
          }
        }
        assert.ok(
          totalCitations >= 5,
          `Expected >= 5 citations across branches, verified ${totalCitations}`,
        );
      },
    );
  }

  // --------------------------------------------------------------------------
  // TEST SUITE F3.5: Adversarial Question Matching (Casing, Whitespace, Punctuation)
  // --------------------------------------------------------------------------
  runTest("F3.5a: Canonical matching handles varied casing and whitespace for all 3 questions", async () => {
    const variations = [
      {
        q: "   what does the mirror of erised reveal, and why is it dangerous?  ",
        vol: "vol-1",
        expectedTitle: "A Reflection of Deepest Longing",
      },
      {
        q: "WHY CAN HARRY RETRIEVE THE PHILOSOPHER'S STONE FROM THE MIRROR???",
        vol: "vol-1",
        expectedTitle: "The Purity of the Unselfish Seeker",
      },
      {
        q: "how did harry come to own the marauder's map, and who created it",
        vol: "vol-3",
        expectedTitle: "The Bequest of the Four Wanderers",
      },
    ];

    for (const v of variations) {
      const run = await mockArchiveAdapter.createRun(
        { question: v.q, mode: "compare", corpus_id: "harry-potter-archive", corpus_version: "v" },
        [v.vol],
      );
      assert.equal(run.branches[0].insufficient_evidence, false);
      assert.equal(run.branches[0].answer_title, v.expectedTitle);
    }
  });

  // --------------------------------------------------------------------------
  // TEST SUITE F3.6: Mismatched Scope and Helpful Volume Guidance
  // --------------------------------------------------------------------------
  runTest("F3.6a: Mismatched volume triggers uncatalogued guidance for Vol 1 queries with Vol 3", async () => {
    const run = await mockArchiveAdapter.createRun(
      { question: MIRROR_OF_ERISED_QUESTION, mode: "compare", corpus_id: "harry-potter-archive", corpus_version: "vol-3-poa" },
      ["vol-3"],
    );
    assert.equal(run.branches[0].insufficient_evidence, true);
    assert.equal(run.branches[0].answer_title, "Uncatalogued Inquiry");
    assert.ok(
      run.branches[0].introduction.includes("The Philosopher's Stone") &&
      run.branches[0].introduction.includes("Volume I"),
      "Guidance must guide user to Volume I / The Philosopher's Stone",
    );
  });

  runTest("F3.6b: Mismatched volume triggers uncatalogued guidance for Vol 3 query with Vol 1", async () => {
    const run = await mockArchiveAdapter.createRun(
      { question: MARAUDERS_MAP_QUESTION, mode: "compare", corpus_id: "harry-potter-archive", corpus_version: "vol-1-ps" },
      ["vol-1"],
    );
    assert.equal(run.branches[0].insufficient_evidence, true);
    assert.equal(run.branches[0].answer_title, "Uncatalogued Inquiry");
    assert.ok(
      run.branches[0].introduction.includes("The Prisoner of Azkaban") &&
      run.branches[0].introduction.includes("Volume III"),
      "Guidance must guide user to Volume III / The Prisoner of Azkaban",
    );
  });

  runTest("F3.6c: Multi-volume selection containing the required volume succeeds", async () => {
    const run = await mockArchiveAdapter.createRun(
      { question: MIRROR_OF_ERISED_QUESTION, mode: "compare", corpus_id: "harry-potter-archive", corpus_version: "vol-1-ps" },
      ["vol-1", "vol-3", "vol-7"],
    );
    assert.equal(run.branches[0].insufficient_evidence, false);
    assert.equal(run.sources.length, 3);
  });

  // --------------------------------------------------------------------------
  // TEST SUITE F3.7: Single Mode Queries (RAG only / Full Context only)
  // --------------------------------------------------------------------------
  runTest("F3.7: Single mode query returns only the requested branch for all 3 pills", async () => {
    for (const item of pillScenarios) {
      const ragRun = await mockArchiveAdapter.createRun(
        { question: item.question, mode: "rag", corpus_id: "harry-potter-archive", corpus_version: "v" },
        [item.volumeId],
      );
      assert.equal(ragRun.branches.length, 1);
      assert.equal(ragRun.branches[0].method, "rag");

      const fullRun = await mockArchiveAdapter.createRun(
        { question: item.question, mode: "full_context", corpus_id: "harry-potter-archive", corpus_version: "v" },
        [item.volumeId],
      );
      assert.equal(fullRun.branches.length, 1);
      assert.equal(fullRun.branches[0].method, "full_context");
    }
  });

  // --------------------------------------------------------------------------
  // TEST SUITE F3.8: Stream Mid-Flight Abort
  // --------------------------------------------------------------------------
  await runAsyncTest("F3.8: AbortSignal stops streaming cleanly for each suggestion pill", async () => {
    configureDemoTiming({ rag: 5000, full_context: 10000, fail: "none" });
    try {
      for (const item of pillScenarios) {
        const controller = new AbortController();
        const iterator = demoInquiryTransport.watch(
          { question: item.question, mode: "compare", corpus_id: "harry-potter-archive", corpus_version: "v" },
          [item.volumeId],
          controller.signal,
        )[Symbol.asyncIterator]();

        const first = await iterator.next();
        assert.equal(first.value.run.status, "running");

        controller.abort();
        await assert.rejects(
          iterator.next(),
          (err) => err.name === "AbortError",
          `AbortError must be thrown for ${item.name}`,
        );
      }
    } finally {
      configureDemoTiming(null);
    }
  });

} finally {
  load.extensions[".ts"] = original;
  if (originalTsx) load.extensions[".tsx"] = originalTsx;
  else delete load.extensions[".tsx"];
}

console.log("\n========================================");
console.log(`TOTAL TESTS: ${testsPassed + testsFailed}`);
console.log(`PASSED: ${testsPassed}`);
console.log(`FAILED: ${testsFailed}`);
console.log("========================================");

if (testsFailed > 0) {
  process.exit(1);
}
