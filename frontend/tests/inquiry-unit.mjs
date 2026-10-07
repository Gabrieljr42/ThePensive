import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

// Exercise the real store and adapter without a browser or a new test dependency.
const load = createRequire(import.meta.url);
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
  const { memoryFragments, memoryWalkPose } = load(
    "../src/features/archive/memoryWalk.ts",
  );
  const fragments = memoryFragments(prepared, request.question);
  assert.ok(fragments.length > 1);
  for (const fragment of fragments.slice(1)) {
    const source = prepared.sources.find((source) => source.id === fragment.id);
    assert.ok(
      source.text.startsWith(fragment.text.replace(/…$/, "")),
      "floating words must be literal source fragments",
    );
    assert.ok(fragment.label.startsWith("PREPARED PARAPHRASE"));
  }
  const unavailable = structuredClone(prepared);
  unavailable.branches.forEach((branch) => {
    branch.context.source_ids = [];
  });
  assert.equal(
    memoryFragments(unavailable, request.question).length,
    1,
    "unconfirmed source text must not appear in the journey",
  );
  assert.equal(
    memoryWalkPose(0).z,
    2.8,
    "the walk starts at the arrival camera without a jump",
  );
  let previousZ = 2.8;
  for (const elapsed of [1, 5, 20, 90, 300]) {
    const pose = memoryWalkPose(elapsed);
    assert.ok(
      pose.z < previousZ && pose.z > -22.3,
      "forward travel stays bounded even in a very long wait",
    );
    assert.ok(
      Math.abs(pose.x) < 0.4 && Math.abs(pose.y - 1.8) < 0.05,
      "the path remains gentle",
    );
    previousZ = pose.z;
  }
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
  const progressive = structuredClone(prepared);
  progressive.status = "running";
  progressive.branches[0] = {
    ...progressive.branches[0],
    status: "generating",
    introduction: "",
    claims: [],
    conclusion: "",
  };
  const progressiveId = s().beginInquiry();
  assert.equal(s().updateInquiry(progressiveId, progressive), true);
  assert.equal(s().isBusy, true, "reading one method must not end the other");
  assert.equal(
    s().firstReadableMethod,
    "full_context",
    "Full Context can finish first",
  );
  s().setPhase("evidence");
  s().setActiveCitation("cit-full-1");
  s().updateInquiry(progressiveId, prepared);
  assert.equal(
    s().firstReadableMethod,
    "full_context",
    "a later RAG answer must not change the reader's tab",
  );
  assert.equal(
    s().phase,
    "evidence",
    "a late branch must not close an open source",
  );
  assert.equal(s().activeCitationId, "cit-full-1");
  s().cancelInquiry();
  assert.equal(s().updateInquiry(progressiveId, prepared), false);

  const {
    demoInquiryTransport,
    configureDemoTiming,
    createHttpInquiryTransport,
  } = load("../src/features/archive/inquiry/transport.ts");
  configureDemoTiming({ rag: 25, full_context: 5, fail: "rag" });
  const snapshots = [];
  for await (const update of demoInquiryTransport.watch(
    request,
    ["vol-3"],
    new AbortController().signal,
  ))
    snapshots.push(update.run);
  const firstReady = snapshots.find((run) =>
    run.branches.some((b) => b.status === "complete"),
  );
  assert.equal(
    firstReady.branches.find((b) => b.status === "complete").method,
    "full_context",
  );
  assert.equal(
    snapshots.at(-1).branches.find((b) => b.method === "rag").status,
    "failed",
  );
  assert.equal(
    snapshots.at(-1).branches.find((b) => b.method === "full_context").claims
      .length > 0,
    true,
  );
  configureDemoTiming({ rag: 90000, full_context: 120000, fail: "none" });
  const cancellation = new AbortController();
  const stream = demoInquiryTransport
    .watch(request, ["vol-3"], cancellation.signal)
    [Symbol.asyncIterator]();
  await stream.next();
  cancellation.abort();
  await assert.rejects(stream.next(), (error) => error.name === "AbortError");
  configureDemoTiming(null);

  const originalFetch = globalThis.fetch;
  try {
    let polls = 0;
    globalThis.fetch = async (url, init) => {
      if (init?.method === "POST") return Response.json(progressive);
      if (polls++ === 0) throw new Error("temporary connection loss");
      return Response.json(prepared);
    };
    const updates = [];
    for await (const update of createHttpInquiryTransport("/api").watch(
      request,
      ["vol-3"],
      new AbortController().signal,
    ))
      updates.push(update);
    assert.equal(updates[0].run.branches[1].status, "complete");
    assert.ok(updates.some((update) => update.connection === "reconnecting"));
    assert.equal(updates.at(-1).run.status, "complete");
    let cancelledOnServer = false;
    globalThis.fetch = async (url) => {
      if (String(url).endsWith("/cancel")) {
        cancelledOnServer = true;
        return Response.json({ status: "cancelled" });
      }
      return Response.json(progressive);
    };
    const abortHttp = new AbortController();
    const http = createHttpInquiryTransport()
      .watch(request, ["vol-3"], abortHttp.signal)
      [Symbol.asyncIterator]();
    await http.next();
    abortHttp.abort();
    await assert.rejects(http.next(), (error) => error.name === "AbortError");
    assert.equal(
      cancelledOnServer,
      true,
      "stopping a stream must request server cancellation",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
  const { configureInquiryTransport } = load(
    "../src/features/archive/inquiry/transport.ts",
  );
  const { submitInquiry } = load(
    "../src/features/archive/inquiry/controller.ts",
  );
  s().setQuietReading(true);
  let execution = 0;
  configureInquiryTransport({
    async *watch(_request, _volumes, signal) {
      if (++execution === 1) {
        await new Promise((_resolve, reject) =>
          signal.addEventListener(
            "abort",
            () =>
              reject(new Error("The server could not confirm cancellation.")),
            { once: true },
          ),
        );
      }
      yield { run: prepared, connection: "connected" };
    },
  });
  const seenErrors = [];
  const observe = useArchiveStore.subscribe((state) => {
    if (state.error) seenErrors.push(state.error);
  });
  try {
    const superseded = submitInquiry(request, ["vol-3"]);
    const replacement = submitInquiry(request, ["vol-3"]);
    await Promise.all([superseded, replacement]);
    assert.equal(
      seenErrors.length,
      0,
      "an old cancellation failure must not fail the replacement request, even transiently",
    );
    assert.equal(s().phase, "reading");
  } finally {
    observe();
    configureInquiryTransport(demoInquiryTransport);
  }
  console.log(
    "Inquiry lifecycle, progressive branches, stale responses, 90-second cancellation, scoped evidence, HTTP reconnection and server cancellation: passed.",
  );
} finally {
  load.extensions[".ts"] = original;
  if (originalTsx) load.extensions[".tsx"] = originalTsx;
  else delete load.extensions[".tsx"];
}
