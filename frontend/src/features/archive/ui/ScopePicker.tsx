"use client";

import { useArchiveStore } from "../store";
import { availableChapters } from "../scope";

export function ScopePicker() {
  const corpus = useArchiveStore((state) => state.corpus);
  const selectedBooks = useArchiveStore((state) => state.selectedVolumeIds);
  const selected = useArchiveStore((state) => state.selectedChapterIds);
  const setSelected = useArchiveStore((state) => state.setSelectedChapters);
  const busy = useArchiveStore((state) => state.isBusy);
  const publicMode = useArchiveStore((state) => state.publicMode);
  const mode = useArchiveStore((state) => state.mode);
  const setMode = useArchiveStore((state) => state.setMode);
  const fullContextTokenLimit = useArchiveStore((state) => state.fullContextTokenLimit);
  if (!corpus) return null;
  const chapters = (corpus.books ?? []).filter((book) => selectedBooks.includes(book.id))
    .flatMap((book) => availableChapters(corpus, book.id, mode)
      .map((chapter) => ({ ...chapter, bookTitle: book.title })));
  const limited = publicMode && mode !== "rag";
  const selectedTokens = chapters
    .filter((chapter) => selected.includes(chapter.id))
    .reduce((total, chapter) => total + chapter.estimated_tokens, 0);
  const allRagChapters = (corpus.books ?? [])
    .filter((book) => selectedBooks.includes(book.id))
    .flatMap((book) => availableChapters(corpus, book.id, "rag").map((chapter) => chapter.id));
  const firstThreeChapters = chapters.slice(0, 3).map((chapter) => chapter.id);
  return (
    <details className="mt-4 rounded border border-[#8a671d]/25 p-3 text-[#3b3226]">
      <summary className="cursor-pointer font-reading text-sm">
        {selected.length ? selected.length + " selected chapters" : "Choose at least one chapter"}
      </summary>
      <p className="mt-2 text-xs">
        {selected.length
          ? "Both methods consult the checked chapters. Catalogue questions keep this selection and may need a wider scope."
          : "Select one or more chapters before asking; an empty selection never expands to the whole corpus."}{" "}
        {limited ? "Public comparisons accept up to three chapters." : "The server checks capacity and cost before each inquiry."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={busy || !allRagChapters.length}
          className="rounded border border-[#8a671d]/30 px-2 py-1 text-xs hover:bg-[#ddcfb3]/60 disabled:opacity-50"
          onClick={() => { setMode("rag"); setSelected(allRagChapters); }}>
          Select all chapters for RAG
        </button>
        <button type="button" disabled={busy || !firstThreeChapters.length}
          className="rounded border border-[#8a671d]/30 px-2 py-1 text-xs hover:bg-[#ddcfb3]/60 disabled:opacity-50"
          onClick={() => setSelected(firstThreeChapters)}>
          Use first three chapters
        </button>
        <button type="button" disabled={busy || !selected.length}
          className="rounded border border-[#8a671d]/30 px-2 py-1 text-xs hover:bg-[#ddcfb3]/60 disabled:opacity-50"
          onClick={() => setSelected([])}>
          Clear selection
        </button>
      </div>
      {mode !== "rag" && fullContextTokenLimit > 0 && (
        <p className="mt-2 text-xs" role="note">
          Full Context is configured for up to {fullContextTokenLimit.toLocaleString()} provider-counted input tokens per run.
          {selected.length ? " Selected source text: about " + selectedTokens.toLocaleString() + " tokens before instructions and citation labels." : ""}
        </p>
      )}
      <div className="mt-3 grid max-h-52 gap-2 overflow-auto">
        {chapters.map((chapter) => (
          <label key={chapter.id} className="flex min-h-8 items-center gap-2 text-xs">
            <input type="checkbox" checked={selected.includes(chapter.id)}
              disabled={busy || (limited && selected.length >= 3 && !selected.includes(chapter.id))}
              onChange={(event) => setSelected(event.target.checked
                ? [...selected, chapter.id] : selected.filter((id) => id !== chapter.id))} />
            <span>{chapter.bookTitle} · {chapter.number}. {chapter.title} · PDF {chapter.page_start}–{chapter.page_end}</span>
          </label>
        ))}
        {!chapters.length && <p>No source chapters are available for the selected books and method.</p>}
      </div>
    </details>
  );
}
