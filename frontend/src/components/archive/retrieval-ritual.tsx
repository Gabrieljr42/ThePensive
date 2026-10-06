import type { ExperimentRun, Mode } from "@/lib/contracts";
import { Icon } from "../icon";

export function RetrievalRitual({
  run,
  mode,
}: {
  run: ExperimentRun;
  mode: Mode;
}) {
  const rag = run.branches.find((branch) => branch.method === "rag");
  const full = run.branches.find((branch) => branch.method === "full_context");
  const selected = new Set(rag?.context.source_ids ?? []);
  const beyondSearch =
    !rag || ["generating", "validating", "complete"].includes(rag.status);
  return (
    <div
      className="retrieval-ritual"
      aria-label="Prepared source selection trace"
      data-converging={beyondSearch}
    >
      <div className="ritual-heading">
        <Icon name="spark" />
        <span>
          {run.data_mode === "mock"
            ? "A DEMONSTRATION OF DISCOVERY"
            : "FOLLOWING THE QUESTION"}
        </span>
        <p>Light finds the leaves. The leaves return an answer.</p>
      </div>
      <div className="ritual-sources">
        {run.sources.map((source, index) => (
          <div
            key={source.id}
            className={`ritual-source ${mode !== "full_context" && selected.has(source.id) ? "ritual-held" : ""} ${mode !== "rag" && full?.context.source_ids.includes(source.id) ? "ritual-context" : ""} ${mode === "rag" && beyondSearch && !selected.has(source.id) ? "ritual-released" : ""}`}
            style={{ "--leaf-order": index } as React.CSSProperties}
          >
            <span className="ritual-spine" aria-hidden="true">
              ✦
            </span>
            <strong>{source.chapter}</strong>
            <small>{source.page_label}</small>
            <span className="sr-only">
              {selected.has(source.id)
                ? "Selected for RAG. "
                : "Not selected for RAG. "}
              {full?.context.source_ids.includes(source.id)
                ? "Included in Full Context."
                : ""}
            </span>
          </div>
        ))}
      </div>
      <p className="ritual-caption">
        {rag && mode !== "full_context" && (
          <span>RAG holds {selected.size} leaves</span>
        )}
        {full && mode !== "rag" && (
          <span>
            Full Context receives all {full.context.selected_source_count}{" "}
            leaves
          </span>
        )}
      </p>
    </div>
  );
}
