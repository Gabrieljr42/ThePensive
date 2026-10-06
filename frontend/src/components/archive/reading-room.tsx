"use client";

import { useState } from "react";
import { useArchiveRun } from "@/lib/use-archive-run";
import type { EvidenceSelection } from "@/lib/contracts";
import { ArchiveShell } from "./archive-shell";
import { Icon } from "../icon";
import { QuestionComposer } from "../question/question-composer";
import { TwinTomes } from "../answers/twin-tomes";
import { ComparisonSummary } from "../metrics/comparison-summary";
import { EvidenceShelf } from "../evidence/evidence-shelf";
import { EvidenceThread } from "../evidence/evidence-thread";
import { EvidenceDrawer } from "../evidence/evidence-drawer";

export function ReadingRoom() {
  const archive = useArchiveRun();
  const [quietOverride, setQuietOverride] = useState<boolean | null>(null);
  const [trace, setTrace] = useState<EvidenceSelection | null>(null);
  const [selection, setSelection] = useState<EvidenceSelection | null>(null);
  const active = selection ?? trace;
  const reading =
    quietOverride ??
    (!!selection ||
      (archive.run?.status === "complete" && !archive.run.is_preview));
  function clearEvidence() {
    setSelection(null);
    setTrace(null);
  }
  function openEvidence(value: EvidenceSelection) {
    setSelection(value);
    setTrace(value);
  }
  return (
    <ArchiveShell
      quiet={reading}
      onQuietChange={() => setQuietOverride(!reading)}
    >
      <main id="main" className="reading-room">
        <section
          className="archive-introduction"
          aria-labelledby="archive-title"
        >
          <div>
            <p className="eyebrow">
              <span /> A QUIET PLACE FOR CURIOUS MINDS
            </p>
            <h1 id="archive-title">
              Ask the story.
              <br />
              <em>Follow the evidence.</em>
            </h1>
            <p className="hero-description">
              One question. Two ways into the books.
              <br className="mobile-break" /> Every answer, a thread back to its
              source.
            </p>
          </div>
          <div className="observatory-note" aria-hidden="true">
            <svg viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="47" />
              <circle cx="60" cy="60" r="37" />
              <ellipse
                cx="60"
                cy="60"
                rx="17"
                ry="47"
                transform="rotate(32 60 60)"
              />
              <path d="M13 60h94M60 13v94M28 28l64 64M28 92l64-64" />
              <circle cx="60" cy="60" r="4" />
            </svg>
            <span>THE MIDNIGHT ARCHIVE</span>
            <p>Knowledge leaves a light.</p>
          </div>
        </section>
        <QuestionComposer
          question={archive.question}
          onQuestionChange={archive.setQuestion}
          mode={archive.mode}
          onModeChange={(mode) => {
            clearEvidence();
            archive.changeMode(mode);
          }}
          corpora={archive.corpora}
          corpusId={archive.corpusId}
          onCorpusChange={(id) => {
            clearEvidence();
            archive.changeCorpus(id);
          }}
          onSubmit={() => {
            clearEvidence();
            void archive.submit();
          }}
          onCancel={() => void archive.cancel()}
          busy={archive.busy}
          loading={archive.loading}
          isDemo={archive.run?.data_mode !== "live"}
        />
        {archive.error && (
          <div
            className="archive-error"
            role="alert"
            aria-label="Archive request error"
          >
            <Icon name="leaf" />
            <div>
              <strong>A connection still waiting.</strong>
              <p>{archive.error}</p>
            </div>
            <button
              onClick={() =>
                void (archive.corpora.length && archive.question
                  ? archive.submit()
                  : archive.reload())
              }
            >
              Try again <Icon name="arrow" />
            </button>
          </div>
        )}
        <section className="reading-results" aria-labelledby="tomes-heading">
          <div className="results-heading">
            <div>
              <span className="eyebrow">THE READING DESK</span>
              <h2 id="tomes-heading">
                {archive.mode === "compare"
                  ? "The Twin Tomes"
                  : archive.mode === "rag"
                    ? "The relevant leaves"
                    : "The complete collection"}
                <span className="heading-ornament" aria-hidden="true">
                  ✦
                </span>
              </h2>
            </div>
            <div className="run-meta">
              {archive.corpus && (
                <span>
                  <Icon name="book" />
                  {archive.corpus.source_count} source passages <i /> One shared
                  collection
                </span>
              )}
              <span>
                {archive.run?.is_preview
                  ? "A prepared reading"
                  : archive.busy
                    ? "The archive is reading…"
                    : archive.error || archive.run?.status === "failed"
                      ? "The reading was interrupted. Completed answers remain available."
                      : archive.run?.status === "cancelled"
                        ? "Reading stopped"
                        : "Original demonstration edition"}
              </span>
            </div>
          </div>
          <div
            className="run-announcement sr-only"
            aria-live="polite"
            aria-atomic="true"
          >
            {archive.busy
              ? (archive.run?.branches
                  .map(
                    (branch) =>
                      `${branch.method === "rag" ? "RAG" : "Full Context"}: ${branch.status.replaceAll("_", " ")}`,
                  )
                  .join(". ") ?? "Opening the archive.")
              : archive.run?.status === "cancelled"
                ? "Reading stopped. Any completed answer remains available."
                : archive.run
                  ? "Reading complete. Answers and source citations are ready."
                  : "The reading room is ready."}
          </div>
          {archive.run ? (
            <>
              <p className="run-question">
                <Icon name="spark" />
                {archive.run.question}
              </p>
              {archive.mode === "compare" && (
                <ComparisonSummary run={archive.run} />
              )}
              <TwinTomes
                run={archive.run}
                mode={archive.mode}
                activeCitation={active?.citation.id ?? null}
                onTrace={setTrace}
                onOpen={openEvidence}
                onAsk={() =>
                  document
                    .getElementById("archive-question")
                    ?.closest("form")
                    ?.requestSubmit()
                }
              />
            </>
          ) : (
            <div
              className={`empty-reading ${archive.loading || archive.busy ? "opening-reading" : ""}`}
            >
              <Icon name="book" />
              <h3>
                {archive.loading
                  ? "Opening the reading room…"
                  : archive.busy
                    ? "A question enters the archive…"
                    : "The next leaf is yours to discover."}
              </h3>
              <p>
                {archive.loading || archive.busy
                  ? "The selected collection is coming into focus."
                  : "Choose a collection and ask a question to open its tomes."}
              </p>
            </div>
          )}
        </section>
        {archive.run && (
          <EvidenceShelf
            run={archive.run}
            mode={archive.mode}
            activeSource={active?.source.id ?? null}
            onOpen={openEvidence}
            onTrace={setTrace}
          />
        )}
        <div className="archive-provenance">
          <Icon name="leaf" />
          <p>
            {archive.corpus?.source_kind === "ingested_edition"
              ? `Source references resolve against ${archive.corpus.edition}.`
              : archive.corpus?.source_kind === "original_companion_notes"
                ? "An original companion to the wizarding stories. Source leaves are demonstration prose, with demo folios rather than novel page numbers."
                : "Original stories from the Midnight Archive. Source leaves and folios belong to this demonstration collection."}
          </p>
          <span>API contract v1.0</span>
        </div>
      </main>
      <EvidenceThread selection={active} />
      {selection && archive.run && (
        <EvidenceDrawer
          key={selection.citation.id}
          selection={selection}
          runId={archive.run.id}
          onClose={clearEvidence}
        />
      )}
    </ArchiveShell>
  );
}
