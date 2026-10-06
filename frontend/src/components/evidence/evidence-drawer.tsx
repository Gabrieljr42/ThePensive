"use client";

import { useEffect, useRef, useState } from "react";
import type { EvidenceResponse, EvidenceSelection } from "@/lib/contracts";
import { archiveApi } from "@/lib/api";
import { Icon } from "../icon";
import { SourceConnection, type SourceOrigin } from "./source-connection";

export function EvidenceDrawer({
  selection,
  runId,
  onClose,
  origin = null,
}: {
  selection: EvidenceSelection;
  runId: string;
  onClose: () => void;
  origin?: SourceOrigin | null;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [evidence, setEvidence] = useState<EvidenceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const element = dialog.current;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    archiveApi
      .evidence(runId, selection.citation.id, controller.signal)
      .then((result) => setEvidence(result))
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error
              ? error.message
              : "The source could not be checked.",
          );
      });
    return () => controller.abort();
  }, [runId, selection.citation.id]);
  const source = evidence?.source ?? selection.source;
  const citation = evidence?.citation ?? selection.citation;
  const claim = evidence?.claim ?? selection.claim;
  const verified = evidence?.citation.structural_status === "verified";
  return (
    <dialog
      ref={dialog}
      className={`evidence-drawer ${selection.branch.method === "full_context" ? "evidence-moonlight" : ""}`}
      aria-labelledby="leaf-title"
      aria-describedby="leaf-description"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="drawer-inner">
        <header className="drawer-header">
          <span>
            <Icon name="leaf" /> THE SOURCE LEAVES <i /> [{citation.number}]
          </span>
          <button
            className="drawer-close"
            aria-label="Close evidence"
            onClick={onClose}
            autoFocus
          >
            <Icon name="close" />
          </button>
        </header>
        <div
          className="drawer-scroll"
          tabIndex={0}
          role="region"
          aria-label="Source evidence and passage"
        >
          <aside className="source-context">
            <p className="eyebrow">AN ANSWER, TRACED TO ITS ORIGIN</p>
            <h2 id="leaf-title">{source.chapter}</h2>
            <p id="leaf-description" className="leaf-description">
              A source leaf cited by{" "}
              {selection.branch.method === "rag" ? "RAG" : "Full Context"} claim{" "}
              {citation.number}.
            </p>
            <dl className="source-metadata">
              <div>
                <dt>Book</dt>
                <dd>{source.book}</dd>
              </div>
              <div>
                <dt>Chapter</dt>
                <dd>
                  {String(source.chapter_number).padStart(2, "0")}{" "}
                  <span>·</span> {source.chapter}
                </dd>
              </div>
              <div>
                <dt>Page reference</dt>
                <dd>{source.page_label}</dd>
              </div>
              <div>
                <dt>Edition</dt>
                <dd>{source.edition}</dd>
              </div>
            </dl>
            <div className="claim-link">
              <span className="eyebrow">THIS CLAIM</span>
              <p>{claim.text}</p>
            </div>
            <p className="source-attribution">{source.attribution}</p>
          </aside>
          <div className="source-manuscript">
            <div className="leaf-connection" aria-hidden="true">
              <span />
              <i>✦</i>
              <span />
            </div>
            <article
              className="excerpt-leaf"
              aria-label="Source passage with supporting excerpt highlighted"
            >
              <div className="folio-header">
                <span>ARCHIVE LEAF</span>
                <span>{source.page_label}</span>
              </div>
              <Icon className="excerpt-emblem" name="book" />
              <h3>{source.chapter}</h3>
              <p>
                {Array.from(source.text)
                  .slice(0, citation.start_offset)
                  .join("")}
                <mark>
                  {Array.from(source.text)
                    .slice(citation.start_offset, citation.end_offset)
                    .join("")}
                </mark>
                {Array.from(source.text).slice(citation.end_offset).join("")}
              </p>
              <div className="folio-footer">
                <span>✦</span>
                <span>
                  {source.page_kind === "demo_folio"
                    ? "ORIGINAL DEMONSTRATION PROSE"
                    : "EXTRACTED SOURCE PASSAGE"}
                </span>
                <span>✦</span>
              </div>
            </article>
            <div
              className={`verification-state ${error || evidence?.citation.structural_status === "invalid" ? "verification-error" : ""}`}
              role="status"
            >
              <Icon name={verified ? "check" : "clock"} />
              <div>
                <strong>
                  {error
                    ? "Source lookup unavailable"
                    : verified
                      ? "Exact passage matched"
                      : evidence?.citation.structural_status === "invalid"
                        ? "This citation could not be verified"
                        : "Checking the source leaf…"}
                </strong>
                <p>
                  {error ??
                    (verified
                      ? "The quotation matches this source and was supplied to the selected tome."
                      : evidence?.citation.structural_status === "invalid"
                        ? "The recorded source check did not establish an exact passage match."
                        : "Resolving the citation against this experiment’s sources.")}
                </p>
                <p className="semantic-support">
                  {citation.support_status === "fixture_reviewed"
                    ? "Claim support was reviewed for this demonstration."
                    : citation.support_status === "supported"
                      ? "The passage was assessed as supporting this claim."
                      : citation.support_status === "unsupported"
                        ? "The passage does not establish support for this claim."
                        : "Claim support has not been assessed."}
                </p>
              </div>
            </div>
          </div>
        </div>
        <footer className="drawer-footer">
          <span>Claim → source → passage</span>
          <button onClick={onClose}>
            Return to the tomes <Icon name="arrow" />
          </button>
        </footer>
      </div>
      <SourceConnection
        origin={origin}
        citationId={selection.citation.id}
        cool={selection.branch.method === "full_context"}
      />
    </dialog>
  );
}
