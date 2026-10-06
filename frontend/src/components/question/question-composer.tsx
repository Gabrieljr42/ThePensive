"use client";

import { useRef } from "react";
import type { Corpus, Mode } from "@/lib/contracts";
import { Icon } from "../icon";
import { CastThread } from "./cast-thread";

const modes: {
  id: Mode;
  label: string;
  icon: "book" | "moon" | "compare";
  description: string;
}[] = [
  {
    id: "rag",
    label: "RAG",
    icon: "book",
    description: "Find relevant passages, then answer from them.",
  },
  {
    id: "full_context",
    label: "Full Context",
    icon: "moon",
    description: "Read the complete selected collection before answering.",
  },
  {
    id: "compare",
    label: "Compare",
    icon: "compare",
    description: "Open both tomes with the same question and collection.",
  },
];

export function QuestionComposer({
  question,
  onQuestionChange,
  mode,
  onModeChange,
  corpora,
  corpusId,
  onCorpusChange,
  onSubmit,
  onCancel,
  busy,
  loading,
  isDemo,
}: {
  question: string;
  onQuestionChange: (value: string) => void;
  mode: Mode;
  onModeChange: (value: Mode) => void;
  corpora: Corpus[];
  corpusId: string;
  onCorpusChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  busy: boolean;
  loading: boolean;
  isDemo: boolean;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  const corpus = corpora.find((item) => item.id === corpusId);
  return (
    <section className="question-desk" aria-labelledby="composer-heading">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="composer-top">
          <label id="composer-heading" htmlFor="archive-question">
            What would you like to uncover?
          </label>
          <span className="demo-label">
            <span />{" "}
            {isDemo ? "Demonstration archive" : "Source-grounded archive"}
          </span>
        </div>
        <div className="question-line">
          <Icon name="spark" />
          <textarea
            ref={input}
            id="archive-question"
            name="question"
            value={question}
            onChange={(event) => onQuestionChange(event.target.value)}
            placeholder="Ask a question of the archive…"
            rows={2}
            maxLength={2000}
            minLength={3}
            required
            disabled={busy || loading}
            aria-describedby="question-hint"
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
        </div>
        <div className="composer-controls">
          <fieldset className="mode-selector">
            <legend className="sr-only">Answering method</legend>
            {modes.map((item) => (
              <label
                className={`mode-choice ${mode === item.id ? "selected" : ""}`}
                key={item.id}
              >
                <input
                  type="radio"
                  name="answer-mode"
                  value={item.id}
                  checked={mode === item.id}
                  onChange={() => onModeChange(item.id)}
                  disabled={busy || loading}
                  aria-describedby={`mode-${item.id}-description`}
                />
                <Icon name={item.icon} />
                <span>{item.label}</span>
                <span id={`mode-${item.id}-description`} className="sr-only">
                  {item.description}
                </span>
              </label>
            ))}
          </fieldset>
          <div className="corpus-control" id="collection">
            <Icon name="book" />
            <label htmlFor="corpus">Collection</label>
            <select
              id="corpus"
              value={corpusId}
              onChange={(event) => onCorpusChange(event.target.value)}
              disabled={busy || loading || !corpora.length}
            >
              {corpora.length ? (
                corpora.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.title}
                  </option>
                ))
              ) : (
                <option value={corpusId}>Opening the collection…</option>
              )}
            </select>
            <Icon name="chevron" />
          </div>
          {busy ? (
            <button
              key="cancel-reading"
              className="cast-button cancel-button"
              type="button"
              onClick={(event) => {
                event.preventDefault();
                onCancel();
              }}
            >
              <Icon name="stop" /> Stop reading
            </button>
          ) : (
            <button
              key="ask-archive"
              className="cast-button"
              type="submit"
              disabled={loading || question.trim().length < 3 || !corpus}
            >
              <span>Ask the archive</span>
              <Icon name="arrow" />
            </button>
          )}
        </div>
        <p id="question-hint" className="question-hint">
          {busy
            ? "Following the question into the selected collection…"
            : modes.find((item) => item.id === mode)?.description}
          <span>Ctrl / ⌘ + Enter</span>
        </p>
        {busy && <CastThread />}
      </form>
      <div className="suggested-questions">
        <span>Begin with a curiosity</span>
        {corpus?.examples.map((example) => (
          <button
            key={example.id}
            disabled={busy || loading}
            onClick={() => {
              onQuestionChange(example.question);
              input.current?.focus();
            }}
          >
            {example.label}
            <Icon name="arrow" />
          </button>
        ))}
      </div>
    </section>
  );
}
