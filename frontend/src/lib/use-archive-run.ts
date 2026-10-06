"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { archiveApi } from "./api";
import type { Corpus, ExperimentRun, Mode } from "./contracts";

function message(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The archive could not complete your request.";
}
function aborted(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function pause(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Cancelled", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, 250);
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
  });
}

export function useArchiveRun() {
  const [corpora, setCorpora] = useState<Corpus[]>([]);
  const [corpusId, setCorpusId] = useState("wizarding-notes");
  const [mode, setMode] = useState<Mode>("compare");
  const [question, setQuestion] = useState("");
  const [run, setRun] = useState<ExperimentRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    Promise.all([
      archiveApi.corpora(controller.signal),
      archiveApi.preview("wizarding-notes", "compare", controller.signal),
    ])
      .then(([collections, preview]) => {
        if (controller.signal.aborted) return;
        setCorpora(collections);
        setRun(preview);
        setQuestion(preview.question);
      })
      .catch((error) => {
        if (!controller.signal.aborted && !aborted(error))
          setError(message(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controllerRef.current?.abort();
  }, []);

  const loadPreview = useCallback(
    async (id: string, nextMode: Mode) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setLoading(true);
      setError(null);
      setRun(null);
      try {
        const collections = corpora.length
          ? corpora
          : await archiveApi.corpora(controller.signal);
        setCorpora(collections);
        const preview = await archiveApi.preview(
          id,
          nextMode,
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setRun(preview);
          setQuestion(preview.question);
        }
      } catch (error) {
        if (!controller.signal.aborted && !aborted(error))
          setError(message(error));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [corpora],
  );

  function changeCorpus(id: string) {
    setCorpusId(id);
    void loadPreview(id, mode);
  }
  function changeMode(nextMode: Mode) {
    setMode(nextMode);
  }

  async function submit() {
    const corpus = corpora.find((item) => item.id === corpusId);
    if (!corpus || question.trim().length < 3 || busy) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setBusy(true);
    setError(null);
    setRun(null);
    try {
      let current = await archiveApi.createRun(
        {
          question: question.trim(),
          mode,
          corpus_id: corpus.id,
          corpus_version: corpus.version,
        },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setRun(current);
      while (current.status === "running") {
        await pause(controller.signal);
        current = await archiveApi.getRun(current.id, controller.signal);
        if (!controller.signal.aborted) setRun(current);
      }
    } catch (error) {
      if (!controller.signal.aborted && !aborted(error))
        setError(message(error));
    } finally {
      if (controllerRef.current === controller) setBusy(false);
    }
  }

  async function cancel() {
    const previousController = controllerRef.current;
    const controller = new AbortController();
    controllerRef.current = controller;
    previousController?.abort();
    try {
      if (run) {
        const cancelled = await archiveApi.cancelRun(run.id, controller.signal);
        if (!controller.signal.aborted && controllerRef.current === controller)
          setRun(cancelled);
      }
    } catch (error) {
      if (!controller.signal.aborted && !aborted(error))
        setError(message(error));
    } finally {
      if (controllerRef.current === controller) setBusy(false);
    }
  }

  return {
    corpora,
    corpus: corpora.find((item) => item.id === corpusId),
    corpusId,
    mode,
    question,
    setQuestion,
    run,
    loading,
    busy,
    error,
    changeCorpus,
    changeMode,
    submit,
    cancel,
    reload: () => loadPreview(corpusId, mode),
  };
}
