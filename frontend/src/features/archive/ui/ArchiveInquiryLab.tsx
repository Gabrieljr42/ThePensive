"use client";
import { useEffect, useState } from "react";
import { configureDemoTiming, type DemoTiming } from "../inquiry/transport";
import { useArchiveStore } from "../store";
import { submitInquiry } from "../inquiry/controller";
import { MARAUDERS_MAP_QUESTION } from "../mock/marauders-map";
import { archiveDirector } from "../director";

export function ArchiveInquiryLab() {
  const [timing, setTiming] = useState<DemoTiming>({
    rag: 12000,
    full_context: 18000,
    fail: "none",
  });
  const [open, setOpen] = useState(true);
  const busy = useArchiveStore((s) => s.isBusy);
  useEffect(() => {
    configureDemoTiming(timing);
    return () => configureDemoTiming(null);
  }, [timing]);
  return (
    <aside className="descent-lab" aria-label="Descent preview controls">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="descent-lab-toggle"
      >
        {open ? "Hide preview controls −" : "Show preview controls +"}
      </button>
      {open && (
        <div className="descent-lab-body">
          <strong>Descent preview</strong>
          <p>
            Prepared answers with simulated timing. These controls apply to the
            next inquiry.
          </p>
          <label>
            RAG delay (seconds)
            <input
              type="number"
              min="0"
              max="180"
              step=".1"
              value={timing.rag / 1000}
              onChange={(e) =>
                setTiming({
                  ...timing,
                  rag:
                    Math.max(0, Math.min(180, Number(e.target.value))) * 1000,
                })
              }
            />
          </label>
          <label>
            Full Context delay (seconds)
            <input
              type="number"
              min="0"
              max="180"
              step=".1"
              value={timing.full_context / 1000}
              onChange={(e) =>
                setTiming({
                  ...timing,
                  full_context:
                    Math.max(0, Math.min(180, Number(e.target.value))) * 1000,
                })
              }
            />
          </label>
          <label>
            Simulated failure
            <select
              value={timing.fail}
              onChange={(e) =>
                setTiming({
                  ...timing,
                  fail: e.target.value as DemoTiming["fail"],
                })
              }
            >
              <option value="none">None</option>
              <option value="rag">RAG</option>
              <option value="full_context">Full Context</option>
              <option value="both">Both methods</option>
            </select>
          </label>
          <div className="descent-lab-actions">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                useArchiveStore.setState({
                  diveCount: 0,
                  question: MARAUDERS_MAP_QUESTION,
                  selectedVolumeIds: ["vol-3"],
                });
                const state = useArchiveStore.getState();
                void submitInquiry(
                  {
                    question: MARAUDERS_MAP_QUESTION,
                    mode: state.mode,
                    corpus_id: "harry-potter-archive",
                    corpus_version: "vol-3-poa",
                  },
                  ["vol-3"],
                );
              }}
            >
              Start preview
            </button>
            {busy && (
              <button
                type="button"
                onClick={() => archiveDirector.cancelInquiry()}
              >
                Stop preview
              </button>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
