"use client";

import { useArchiveStore } from "../store";

export function ScopePicker() {
  const corpus = useArchiveStore((state) => state.corpus);
  const selectedBooks = useArchiveStore((state) => state.selectedVolumeIds);
  const selected = useArchiveStore((state) => state.selectedChapterIds);
  const setSelected = useArchiveStore((state) => state.setSelectedChapters);
  const busy = useArchiveStore((state) => state.isBusy);
  const publicMode = useArchiveStore((state) => state.publicMode);
  const mode = useArchiveStore((state) => state.mode);
  if (!corpus) return null;
  const chapters = (corpus.books ?? []).filter((book) => selectedBooks.includes(book.id))
    .flatMap((book) => book.chapters.filter((chapter) => chapter.source_count > 0)
      .map((chapter) => ({ ...chapter, bookTitle: book.title })));
  const limited = publicMode && mode !== "rag";
  return (
    <details className="mt-4 rounded border border-[#8a671d]/25 p-3 text-[#3b3226]">
      <summary className="cursor-pointer font-reading text-sm">
        {selected.length ? `${selected.length} selected chapters` : "All imported chapters in the selected books"}
      </summary>
      <p className="mt-2 text-xs">Both methods consult this same scope. {limited ? "Public comparisons accept up to three chapters." : "The server checks capacity and cost before each inquiry."}</p>
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
        {!chapters.length && <p>No chapters have been imported for these books.</p>}
      </div>
    </details>
  );
}
