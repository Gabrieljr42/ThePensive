"use client";

import { useState } from "react";
import type {
  EvidenceSelection,
  ExperimentRun,
  Method,
  Mode,
} from "@/lib/contracts";
import { Icon } from "../icon";
import { AnswerTome } from "./answer-tome";

export function TwinTomes({
  run,
  mode,
  activeCitation,
  onTrace,
  onOpen,
  onAsk,
}: {
  run: ExperimentRun;
  mode: Mode;
  activeCitation: string | null;
  onTrace: (selection: EvidenceSelection | null) => void;
  onOpen: (selection: EvidenceSelection) => void;
  onAsk: () => void;
}) {
  const [mobileMethod, setMobileMethod] = useState<Method>("rag");
  const [stacked, setStacked] = useState(false);
  const branches = run.branches.filter(
    (branch) => mode === "compare" || branch.method === mode,
  );
  const both = mode === "compare";
  const methods: Method[] = both ? ["rag", "full_context"] : [mode as Method];
  function changeTab(method: Method) {
    setMobileMethod(method);
    onTrace(null);
  }
  return (
    <>
      {both && (
        <div className="mobile-comparison-controls">
          <div role="tablist" aria-label="Read a comparison answer">
            {methods.map((method, index) => (
              <button
                key={method}
                role="tab"
                id={`tab-${method}`}
                aria-controls={`panel-${method}`}
                aria-selected={mobileMethod === method}
                tabIndex={mobileMethod === method ? 0 : -1}
                onClick={() => changeTab(method)}
                onKeyDown={(event) => {
                  if (
                    !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                      event.key,
                    )
                  )
                    return;
                  event.preventDefault();
                  const nextIndex =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? methods.length - 1
                        : (index + 1) % methods.length;
                  changeTab(methods[nextIndex]);
                  document.getElementById(`tab-${methods[nextIndex]}`)?.focus();
                }}
              >
                <Icon name={method === "rag" ? "book" : "moon"} />
                {method === "rag" ? "RAG" : "Full Context"}
              </button>
            ))}
          </div>
          <button
            className="stack-control"
            aria-pressed={stacked}
            onClick={() => setStacked(!stacked)}
          >
            <Icon name="compare" />
            {stacked ? "Use tabs" : "Stack answers"}
          </button>
        </div>
      )}
      {branches.length ? (
        <div
          className={`twin-tomes ${both ? "paired" : "single"} ${stacked ? "stacked" : ""}`}
        >
          {methods.map((method) => {
            const branch = branches.find((item) => item.method === method);
            return (
              <div
                key={method}
                id={`panel-${method}`}
                className={`tome-panel ${both && mobileMethod !== method ? "mobile-inactive" : ""}`}
              >
                {branch ? (
                  <AnswerTome
                    branch={branch}
                    run={run}
                    activeCitation={activeCitation}
                    onTrace={onTrace}
                    onOpen={onOpen}
                  />
                ) : (
                  <div
                    className={`answer-tome missing-tome ${method === "rag" ? "tome-brass" : "tome-moonlight"}`}
                  >
                    <Icon name={method === "rag" ? "book" : "moon"} />
                    <h3>{method === "rag" ? "RAG" : "Full Context"}</h3>
                    <h4>An unopened volume.</h4>
                    <p>
                      This method was not requested for the previous run. Ask
                      the archive to open{" "}
                      {both ? "both tomes with one question" : "this tome"}.
                    </p>
                    <button onClick={onAsk}>
                      {both ? "Open both tomes" : "Open this tome"}
                      <Icon name="arrow" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {both && (
            <div className="central-gutter" aria-hidden="true">
              <span>✦</span>
              <i />
              <span className="gutter-seal">
                <Icon name="compare" />
              </span>
              <i />
              <span>✦</span>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-reading">
          <Icon name={mode === "rag" ? "book" : "moon"} />
          <h3>Open this tome with your question.</h3>
          <p>
            Ask the archive to read with{" "}
            {mode === "rag" ? "RAG" : "Full Context"}.
          </p>
        </div>
      )}
      <p className="metrics-note">
        <Icon name="leaf" />{" "}
        {run.data_mode === "mock"
          ? "Prepared answers and illustrative metrics. No live model calls or API charges."
          : "Run measurements use reported usage. API cost is an estimate based on the recorded prices."}
      </p>
    </>
  );
}
