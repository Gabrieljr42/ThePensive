import type { ArchiveRun } from "./model";

export type MemoryFragment = {
  id: string;
  title: string;
  text: string;
  label: string;
};
function excerpt(text: string, limit = 32) {
  const words = text.trim().split(/\s+/);
  return words.slice(0, limit).join(" ") + (words.length > limit ? "…" : "");
}
/** Source fragments only appear once their identifiers arrive in the context manifest. */
export function memoryFragments(
  run: ArchiveRun | null,
  question: string,
): MemoryFragment[] {
  const ids = new Set(
    run?.branches.flatMap((branch) => branch.context.source_ids) ?? [],
  );
  const sources =
    run?.sources.filter((source) => ids.has(source.id)).slice(0, 4) ?? [];
  return [
    {
      id: "inquiry",
      title: "A thought, set free",
      text: excerpt(run?.question ?? question, 36),
      label: "YOUR INQUIRY",
    },
    ...sources.map((source) => ({
      id: source.id,
      title: source.chapter,
      text: excerpt(source.text),
      label:
        run?.data_mode === "mock"
          ? "PREPARED PARAPHRASE · " + source.book_short
          : "SOURCE FRAGMENT · " + source.book_short,
    })),
  ];
}
/** A bounded forward glide, with small curves and no roll or repeating camera jump. */
export function memoryWalkPose(seconds: number) {
  const time = Math.max(0, seconds);
  const fade = 1 - Math.exp(-time / 4);
  const x = Math.sin(time * 0.13) * 0.38 * fade;
  const y = 1.8 + Math.sin(time * 0.19) * 0.045 * fade;
  const z = 2.8 - 25 * (1 - Math.exp(-time / 48));
  return {
    x,
    y,
    z,
    targetX: x + Math.sin(time * 0.09) * 0.28 * fade,
    targetY: y + 0.25,
    targetZ: z - 16.8,
  };
}
