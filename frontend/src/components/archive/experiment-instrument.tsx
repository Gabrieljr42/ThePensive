import type { ExperimentRun, Mode } from "@/lib/contracts";
import { Icon } from "../icon";

export function ExperimentInstrument({
  run,
  mode,
  busy,
}: {
  run: ExperimentRun | null;
  mode: Mode;
  busy: boolean;
}) {
  const incomplete = run?.branches.find(
    (branch) => !["complete", "cancelled", "failed"].includes(branch.status),
  );
  const label =
    incomplete?.status === "preparing_context"
      ? "GATHERING THE LEAVES"
      : incomplete?.status === "generating"
        ? "INSCRIBING THE ANSWER"
        : incomplete?.status === "validating"
          ? "TRACING THE SOURCES"
          : busy
            ? "THE ARCHIVE STIRS"
            : "THE DESK IS READY";
  const angle =
    incomplete?.status === "preparing_context"
      ? 45
      : incomplete?.status === "generating"
        ? 145
        : incomplete?.status === "validating"
          ? 260
          : 320;
  return (
    <aside
      className="experiment-instrument"
      aria-label="Experiment information"
    >
      <span className="eyebrow">THE READING INSTRUMENT</span>
      <div className="instrument-dial" data-method={mode} data-searching={busy}>
        <svg viewBox="0 0 180 180" aria-hidden="true">
          <circle cx="90" cy="90" r="76" />
          <circle cx="90" cy="90" r="67" />
          <circle cx="90" cy="90" r="47" />
          <circle cx="90" cy="90" r="25" />
          {Array.from({ length: 24 }, (_, index) => (
            <path
              key={index}
              d="M90 17v7"
              transform={`rotate(${index * 15} 90 90)`}
            />
          ))}
          <path
            className="instrument-hand"
            d="M90 34v104M83 46l7-12 7 12"
            transform={`rotate(${angle} 90 90)`}
          />
          <path d="M46 90h88M90 46v88" />
          <circle className="instrument-center" cx="90" cy="90" r="4" />
        </svg>
        <span className="instrument-star">✦</span>
      </div>
      <p className="instrument-status">{label}</p>
      <span className="instrument-method">
        {mode === "compare"
          ? "Two perspectives"
          : mode === "rag"
            ? "Relevant passages"
            : "Complete context"}
      </span>
      <div className="instrument-rule" />
      <dl>
        <div>
          <dt>Model</dt>
          <dd>{run?.configuration.model ?? "Prepared demonstration"}</dd>
        </div>
        <div>
          <dt>Scope</dt>
          <dd>{run?.configuration.scope_label ?? "The selected volume"}</dd>
        </div>
      </dl>
      <p className="instrument-note">
        <Icon name="clock" /> Illustrative measurements
        <br />
        No live model calls
      </p>
    </aside>
  );
}
