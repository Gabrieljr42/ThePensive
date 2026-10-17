import type { Corpus, Mode } from "@/lib/contracts";

export function chapterIsAvailable(
  chapter: NonNullable<Corpus["books"]>[number]["chapters"][number],
  mode: Mode,
) {
  return chapter.source_count > 0 && (mode === "full_context" || chapter.indexed);
}

export function availableChapters(corpus: Corpus, bookId: string, mode: Mode) {
  return (corpus.books ?? [])
    .find((book) => book.id === bookId)
    ?.chapters.filter((chapter) => chapterIsAvailable(chapter, mode)) ?? [];
}

export function bookIsAvailable(corpus: Corpus, bookId: string, mode: Mode) {
  return availableChapters(corpus, bookId, mode).length > 0;
}
