# Milestone 1: Features F3 & F4 Technical Specification & Implementation Plan

**Author**: Explorer M1_2 (Mock Scenarios & Backend Contracts)  
**Date**: 2026-10-07  
**Scope**: 
- Feature F3: Suggestion Pill Mock Scenarios in `frontend/src/features/archive/mock/adapter.ts`
- Feature F4: Corpus Identifier Contracts (`harry-potter-archive` vs `wizarding-notes`) and Backend State Persistence in `backend/app/experiments.py`

---

## 1. Feature F3: Suggestion Pill Scenarios Design

### 1.1 Context & Problem Statement
`QuestionLeaf.tsx` displays three catalogued suggestion buttons:
1. **The Marauder's Map**: `"How did Harry come to own the Marauder's Map, and who created it?"` (Volume III)
2. **The Mirror of Erised**: `"What does the Mirror of Erised reveal, and why is it dangerous?"` (Volume I)
3. **The Philosopher's Stone**: `"Why can Harry retrieve the Philosopher's Stone from the mirror?"` (Volume I)

Currently, `mockArchiveAdapter.createRun()` in `adapter.ts` only matches `MARAUDERS_MAP_QUESTION` and checks `selectedVolumes.includes("vol-3")`. When clicking suggestions 2 or 3, users receive an `"Uncatalogued Inquiry"` error branch stating *"This question has no prepared answer"*. Furthermore, clicking suggestion pills in `QuestionLeaf.tsx` only updates the input textarea without adjusting `selectedVolumeIds`, causing scope mismatches even if a question was recognized.

### 1.2 Proposed Architecture
1. **Dedicated Mock Scenario Modules**:
   - `frontend/src/features/archive/mock/mirror-of-erised.ts`
   - `frontend/src/features/archive/mock/philosophers-stone.ts`
   Each module exports the question string, verified source passages from Volume I (*The Philosopher's Stone*), 3D retrieval candidates, a RAG branch, a Full Context branch, and the complete `ArchiveRun` mock object.
2. **Dynamic Offset & Verbatim Alignment**:
   In `adapter.ts`, citations are mapped dynamically to ensure that `source.text.indexOf(citation.excerpt)` computes exact `start_offset` and `end_offset` values. All excerpt strings are guaranteed to be exact character-by-character substrings of their respective sources.
3. **Scope Sensitivity & Helpful Guidance**:
   - If a question belongs to Volume I and `vol-1` is in `selectedVolumes`, return the prepared run.
   - If `vol-1` is not selected, return a clear guidance message directing the reader to select Volume I (*The Philosopher's Stone*).
   - In `QuestionLeaf.tsx`, clicking a suggestion pill automatically ensures its associated volume is selected in `useArchiveStore` via `selectSingleVolume`.
4. **Stream Fragments & 3D Descent Integration**:
   `memoryFragments(run, question)` in `memoryWalk.ts` consumes `run.sources` and `branch.context.source_ids`. By supplying rich passages with `book_short: "Stone"`, the 3D descent canvas (`MemoryFolios.tsx`) displays floating vellum folios labeled `"PREPARED PARAPHRASE · Stone"` with verbatim excerpts during the journey.

---

### 1.3 Exact Code & Data Definitions for F3

#### A. `frontend/src/features/archive/mock/mirror-of-erised.ts`
```typescript
import type { SourcePassage } from "@/lib/contracts";
import type { ArchiveBranch, ArchiveRun, RetrievalTrace } from "../model";

export const MIRROR_OF_ERISED_QUESTION =
  "What does the Mirror of Erised reveal, and why is it dangerous?";

export const MIRROR_OF_ERISED_SOURCES: SourcePassage[] = [
  {
    id: "src-ps-ch12-reflection",
    corpus_id: "harry-potter-archive",
    corpus_version: "vol-1-ps",
    book: "The Philosopher's Stone",
    book_short: "Stone",
    edition: "Pensieve Archive · First Volume Edition",
    chapter: "The Mirror of Erised",
    chapter_number: 12,
    page_label: "207",
    page_kind: "demo_folio",
    text: "Drawn into an unused classroom by night, Harry discovered a magnificent mirror reaching to the ceiling, with an ornate gold frame bearing the inscription Erised stra ehru oyt ube cafru oyt on wohsi. Gazing into its depths, he did not see his solitary reflection, but an entire crowd standing behind him. Looking closer, he recognized the green eyes and dark untidy hair of his parents, smiling and waving, surrounded by generations of family he had never known. When Ron Weasley peered into the same glass, he saw himself alone as Head Boy, holding the Quidditch cup aloft as Gryffindor captain.",
    attribution:
      "Original paraphrased demonstration passage · Volume I, Chapter 12",
  },
  {
    id: "src-ps-ch12-warning",
    corpus_id: "harry-potter-archive",
    corpus_version: "vol-1-ps",
    book: "The Philosopher's Stone",
    book_short: "Stone",
    edition: "Pensieve Archive · First Volume Edition",
    chapter: "The Mirror of Erised",
    chapter_number: 12,
    page_label: "213",
    page_kind: "demo_folio",
    text: "Sitting on a desk in the shadowy chamber, Headmaster Dumbledore gently interrupted Harry's third nocturnal vigil. He explained that the mirror shows neither knowledge nor truth, but only the deepest, most desperate desire of our hearts. Men had wasted away before it, entranced by what they saw, or driven mad from not knowing if what it displayed was real or even possible. Dumbledore gave a grave warning: it does not do to dwell on dreams and forget to live.",
    attribution:
      "Original paraphrased demonstration passage · Volume I, Chapter 12",
  },
  {
    id: "src-ps-ch17-safeguard",
    corpus_id: "harry-potter-archive",
    corpus_version: "vol-1-ps",
    book: "The Philosopher's Stone",
    book_short: "Stone",
    edition: "Pensieve Archive · First Volume Edition",
    chapter: "The Man with Two Faces",
    chapter_number: 17,
    page_label: "288",
    page_kind: "demo_folio",
    text: "Deep beneath the trapdoor, Harry encountered Quirrell standing before the very same mirror. Dumbledore had repurposed its unique enchantment into the ultimate barrier protecting the Philosopher's Stone. Quirrell complained that he saw himself presenting the Stone to his master, yet could not extract it from the glass. The mirror had been bound so that only one who wanted to find the Stone, but not make use of it, would be permitted to possess it.",
    attribution:
      "Original paraphrased demonstration passage · Volume I, Chapter 17",
  },
];

export const MIRROR_OF_ERISED_RETRIEVAL: RetrievalTrace = {
  candidates: [
    {
      chunkId: "chunk-0205",
      sourceId: "src-ps-ch12-reflection",
      volumeId: "vol-1",
      bookTitle: "The Philosopher's Stone",
      chapterTitle: "The Mirror of Erised",
      chapterNumber: 12,
      pageLabel: "207",
      similarity: 0.92,
      rerankScore: 0.96,
      rank: 1,
      shelfCoords: { aisle: 1, row: 2, slot: 7 },
      excerpt: "Drawn into an unused classroom by night, Harry discovered a magnificent mirror...",
    },
    {
      chunkId: "chunk-0212",
      sourceId: "src-ps-ch12-warning",
      volumeId: "vol-1",
      bookTitle: "The Philosopher's Stone",
      chapterTitle: "The Mirror of Erised",
      chapterNumber: 12,
      pageLabel: "213",
      similarity: 0.89,
      rerankScore: 0.93,
      rank: 2,
      shelfCoords: { aisle: 1, row: 2, slot: 14 },
      excerpt: "Sitting on a desk in the shadowy chamber, Headmaster Dumbledore gently interrupted...",
    },
    {
      chunkId: "chunk-0287",
      sourceId: "src-ps-ch17-safeguard",
      volumeId: "vol-1",
      bookTitle: "The Philosopher's Stone",
      chapterTitle: "The Man with Two Faces",
      chapterNumber: 17,
      pageLabel: "288",
      similarity: 0.78,
      rerankScore: 0.65,
      rank: null,
      shelfCoords: { aisle: 1, row: 4, slot: 19 },
      excerpt: "Deep beneath the trapdoor, Harry encountered Quirrell standing before the mirror...",
    },
    {
      chunkId: "chunk-0145",
      sourceId: "src-discard-m1",
      volumeId: "vol-1",
      bookTitle: "The Philosopher's Stone",
      chapterTitle: "The Midnight Duel",
      chapterNumber: 9,
      pageLabel: "154",
      similarity: 0.64,
      rerankScore: 0.35,
      rank: null,
      shelfCoords: { aisle: 1, row: 1, slot: 11 },
      excerpt: "The trophy room gleaming with silver cups under the moonlight...",
    },
    {
      chunkId: "chunk-0198",
      sourceId: "src-discard-m2",
      volumeId: "vol-1",
      bookTitle: "The Philosopher's Stone",
      chapterTitle: "Quidditch",
      chapterNumber: 11,
      pageLabel: "186",
      similarity: 0.58,
      rerankScore: 0.28,
      rank: null,
      shelfCoords: { aisle: 1, row: 2, slot: 3 },
      excerpt: "The roar of the crowd as the Golden Snitch darted past the goalposts...",
    },
  ],
  retrievedChunkIds: ["chunk-0205", "chunk-0212"],
  reranker: "bge-reranker-large",
  embeddingModel: "text-embedding-3-large",
  topK: 2,
};

export const MIRROR_OF_ERISED_RAG_BRANCH: ArchiveBranch = {
  id: "run-mirror-rag",
  method: "rag",
  status: "complete",
  answer_title: "A Reflection of Deepest Longing",
  introduction:
    "Through selective vector retrieval of the twelfth chapter, the mirror's true power and its perilous enchantment resolve in two decisive encounters.",
  claims: [
    {
      id: "claim-mirror-rag-1",
      text: "The Mirror of Erised reflects neither objective reality nor truth, but the deepest, most desperate desire of the beholder's heart — showing Harry his lost family and Ron personal glory.",
      citations: [
        {
          id: "cit-mirror-rag-1",
          number: 1,
          source_id: "src-ps-ch12-reflection",
          excerpt:
            "Gazing into its depths, he did not see his solitary reflection, but an entire crowd standing behind him. Looking closer, he recognized the green eyes and dark untidy hair of his parents",
          start_offset: 199,
          end_offset: 382,
          structural_status: "verified",
          support_status: "supported",
        },
      ],
    },
    {
      id: "claim-mirror-rag-2",
      text: "The danger of the mirror lies in total psychological absorption; Dumbledore warns that people have wasted away or been driven mad dwelling on illusions while forgetting to live.",
      citations: [
        {
          id: "cit-mirror-rag-2",
          number: 2,
          source_id: "src-ps-ch12-warning",
          excerpt:
            "He explained that the mirror shows neither knowledge nor truth, but only the deepest, most desperate desire of our hearts. Men had wasted away before it, entranced by what they saw, or driven mad",
          start_offset: 96,
          end_offset: 295,
          structural_status: "verified",
          support_status: "supported",
        },
      ],
    },
  ],
  conclusion:
    "RAG successfully isolates the nature of the enchantment and Dumbledore's warning, but its bounded retrieval excludes the mirror's subsequent role as an incorruptible guardian.",
  insufficient_evidence: false,
  context: {
    source_ids: ["src-ps-ch12-reflection", "src-ps-ch12-warning"],
    selected_source_count: 2,
    supplied_source_count: 5,
    strategy: "retrieved_passages",
    is_simulated: false,
  },
  metrics: {
    basis: "illustrative",
    latency_ms: 1240,
    input_tokens: 1560,
    output_tokens: 284,
    cached_input_tokens: 0,
    estimated_cost_usd: 0.00095,
    pricing_label: "$0.15/1M input · $0.60/1M output",
  },
  retrieval: MIRROR_OF_ERISED_RETRIEVAL,
};

export const MIRROR_OF_ERISED_FULL_BRANCH: ArchiveBranch = {
  id: "run-mirror-full",
  method: "full_context",
  status: "complete",
  answer_title: "The Archival Inquiry into Desire and Choice",
  introduction:
    "Holding the entire first volume in active attention links Harry's nocturnal discovery of his family with the ultimate test against Lord Voldemort beneath the trapdoor.",
  claims: [
    {
      id: "claim-mirror-full-1",
      text: "The mirror reflects the secret longing of whoever stands before it, showing Harry his deceased parents and Ron standing victorious as Gryffindor Quidditch captain.",
      citations: [
        {
          id: "cit-mirror-full-1",
          number: 1,
          source_id: "src-ps-ch12-reflection",
          excerpt:
            "When Ron Weasley peered into the same glass, he saw himself alone as Head Boy, holding the Quidditch cup aloft as Gryffindor captain.",
          start_offset: 457,
          end_offset: 591,
          structural_status: "verified",
          support_status: "supported",
        },
      ],
    },
    {
      id: "claim-mirror-full-2",
      text: "Dumbledore cautioned that the glass offers neither knowledge nor genuine futures, warning that wizards have wasted away entranced by false visions while neglecting reality.",
      citations: [
        {
          id: "cit-mirror-full-2",
          number: 2,
          source_id: "src-ps-ch12-warning",
          excerpt:
            "Dumbledore gave a grave warning: it does not do to dwell on dreams and forget to live.",
          start_offset: 357,
          end_offset: 443,
          structural_status: "verified",
          support_status: "supported",
        },
      ],
    },
    {
      id: "claim-mirror-full-3",
      text: "Beyond personal yearning, Dumbledore transformed the mirror's power into a moral discriminator, ensuring that only someone who desired the Stone without wanting to exploit it could retrieve it.",
      citations: [
        {
          id: "cit-mirror-full-3",
          number: 3,
          source_id: "src-ps-ch17-safeguard",
          excerpt:
            "The mirror had been bound so that only one who wanted to find the Stone, but not make use of it, would be permitted to possess it.",
          start_offset: 335,
          end_offset: 466,
          structural_status: "verified",
          support_status: "supported",
        },
      ],
    },
  ],
  conclusion:
    "Full context reveals the full philosophical arc: the mirror exposes passive longing in the vulnerable, but becomes an active trial of virtue in the resolute — at ~50× greater token volume.",
  insufficient_evidence: false,
  context: {
    source_ids: [
      "src-ps-ch12-reflection",
      "src-ps-ch12-warning",
      "src-ps-ch17-safeguard",
    ],
    selected_source_count: 3,
    supplied_source_count: 1040,
    strategy: "complete_scope",
    is_simulated: false,
  },
  metrics: {
    basis: "illustrative",
    latency_ms: 8920,
    input_tokens: 78500,
    output_tokens: 395,
    cached_input_tokens: 61000,
    estimated_cost_usd: 0.196,
    pricing_label: "$2.50/1M input · $10.00/1M output",
  },
};

export const MIRROR_OF_ERISED_RUN: ArchiveRun = {
  schema_version: "1.0",
  id: "run-mirror-of-erised",
  question: MIRROR_OF_ERISED_QUESTION,
  mode: "compare",
  data_mode: "mock",
  is_preview: false,
  created_at: new Date().toISOString(),
  status: "complete",
  configuration: {
    corpus_id: "harry-potter-archive",
    corpus_version: "vol-1-ps",
    scope_label: "Volume I · The Philosopher's Stone",
    model: "pensieve-dual-evaluator-v1",
    prompt_version: "v2.4-strict-provenance",
    output_limit: 800,
  },
  scopeVolumeIds: ["vol-1"],
  branches: [MIRROR_OF_ERISED_RAG_BRANCH, MIRROR_OF_ERISED_FULL_BRANCH],
  sources: MIRROR_OF_ERISED_SOURCES,
};
```

---

#### B. `frontend/src/features/archive/mock/philosophers-stone.ts`
```typescript
import type { SourcePassage } from "@/lib/contracts";
import type { ArchiveBranch, ArchiveRun, RetrievalTrace } from "../model";

export const PHILOSOPHERS_STONE_QUESTION =
  "Why can Harry retrieve the Philosopher's Stone from the mirror?";

export const PHILOSOPHERS_STONE_SOURCES: SourcePassage[] = [
  {
    id: "src-ps-ch17-stone-enchantment",
    corpus_id: "harry-potter-archive",
    corpus_version: "vol-1-ps",
    book: "The Philosopher's Stone",
    book_short: "Stone",
    edition: "Pensieve Archive · First Volume Edition",
    chapter: "The Man with Two Faces",
    chapter_number: 17,
    page_label: "291",
    page_kind: "demo_folio",
    text: "In the hospital wing, Dumbledore enlightened Harry on the mirror's masterwork. It was one of his more brilliant ideas, he confided with quiet satisfaction. Only one who wanted to find the Stone — find it, and not use it — would be able to get it; anyone else would just see themselves making gold or drinking the Elixir of Life. This ingenious condition thwarted anyone seeking immortality or wealth.",
    attribution:
      "Original paraphrased demonstration passage · Volume I, Chapter 17",
  },
  {
    id: "src-ps-ch17-stone-pocket",
    corpus_id: "harry-potter-archive",
    corpus_version: "vol-1-ps",
    book: "The Philosopher's Stone",
    book_short: "Stone",
    edition: "Pensieve Archive · First Volume Edition",
    chapter: "The Man with Two Faces",
    chapter_number: 17,
    page_label: "289",
    page_kind: "demo_folio",
    text: "Forced before the glass by Quirrell, Harry stared into the mirror knowing he must hide the truth. His primary, desperate urge was not to brew elixir or hoard riches, but purely to find the Stone before Quirrell could lay hands on it. Seeing his own reflection smile and slip a blood-red stone into its coat pocket, Harry felt a sudden physical weight drop into his real pocket, realizing the enchantment had judged his motives pure.",
    attribution:
      "Original paraphrased demonstration passage · Volume I, Chapter 17",
  },
  {
    id: "src-ps-ch12-stone-longing",
    corpus_id: "harry-potter-archive",
    corpus_version: "vol-1-ps",
    book: "The Philosopher's Stone",
    book_short: "Stone",
    edition: "Pensieve Archive · First Volume Edition",
    chapter: "The Mirror of Erised",
    chapter_number: 12,
    page_label: "213",
    page_kind: "demo_folio",
    text: "Months prior, Dumbledore had explained the fundamental law of the mirror: it exposes the heart's unvarnished desire. Because the mirror reflects true desire rather than spoken pretense, no charm, curse, or deceit could fool its glass. Quirrell and Voldemort failed because their consuming desire was to use the Stone, whereas Harry's sole desire was its protection.",
    attribution:
      "Original paraphrased demonstration passage · Volume I, Chapter 12",
  },
];

export const PHILOSOPHERS_STONE_RETRIEVAL: RetrievalTrace = {
  candidates: [
    {
      chunkId: "chunk-0294",
      sourceId: "src-ps-ch17-stone-enchantment",
      volumeId: "vol-1",
      bookTitle: "The Philosopher's Stone",
      chapterTitle: "The Man with Two Faces",
      chapterNumber: 17,
      pageLabel: "291",
      similarity: 0.94,
      rerankScore: 0.98,
      rank: 1,
      shelfCoords: { aisle: 1, row: 4, slot: 21 },
      excerpt: "In the hospital wing, Dumbledore enlightened Harry on the mirror's masterwork...",
    },
    {
      chunkId: "chunk-0289",
      sourceId: "src-ps-ch17-stone-pocket",
      volumeId: "vol-1",
      bookTitle: "The Philosopher's Stone",
      chapterTitle: "The Man with Two Faces",
      chapterNumber: 17,
      pageLabel: "289",
      similarity: 0.91,
      rerankScore: 0.94,
      rank: 2,
      shelfCoords: { aisle: 1, row: 4, slot: 17 },
      excerpt: "Forced before the glass by Quirrell, Harry stared into the mirror...",
    },
    {
      chunkId: "chunk-0213",
      sourceId: "src-ps-ch12-stone-longing",
      volumeId: "vol-1",
      bookTitle: "The Philosopher's Stone",
      chapterTitle: "The Mirror of Erised",
      chapterNumber: 12,
      pageLabel: "213",
      similarity: 0.79,
      rerankScore: 0.61,
      rank: null,
      shelfCoords: { aisle: 1, row: 2, slot: 15 },
      excerpt: "Months prior, Dumbledore had explained the fundamental law of the mirror...",
    },
    {
      chunkId: "chunk-0160",
      sourceId: "src-discard-s1",
      volumeId: "vol-1",
      bookTitle: "The Philosopher's Stone",
      chapterTitle: "Halloween",
      chapterNumber: 10,
      pageLabel: "173",
      similarity: 0.52,
      rerankScore: 0.21,
      rank: null,
      shelfCoords: { aisle: 1, row: 2, slot: 1 },
      excerpt: "The troll paused, raising its massive wooden club into the air...",
    },
  ],
  retrievedChunkIds: ["chunk-0294", "chunk-0289"],
  reranker: "bge-reranker-large",
  embeddingModel: "text-embedding-3-large",
  topK: 2,
};

export const PHILOSOPHERS_STONE_RAG_BRANCH: ArchiveBranch = {
  id: "run-stone-rag",
  method: "rag",
  status: "complete",
  answer_title: "The Purity of the Unselfish Seeker",
  introduction:
    "Direct retrieval across the climax reveals the exact magical condition Dumbledore wove into the mirror to safeguard the Philosopher's Stone.",
  claims: [
    {
      id: "claim-stone-rag-1",
      text: "Dumbledore enchanted the mirror so that only a person who wished to find the Stone without intending to use its powers could retrieve it.",
      citations: [
        {
          id: "cit-stone-rag-1",
          number: 1,
          source_id: "src-ps-ch17-stone-enchantment",
          excerpt:
            "Only one who wanted to find the Stone — find it, and not use it — would be able to get it; anyone else would just see themselves making gold or drinking the Elixir of Life.",
          start_offset: 157,
          end_offset: 326,
          structural_status: "verified",
          support_status: "supported",
        },
      ],
    },
    {
      id: "claim-stone-rag-2",
      text: "When Harry stood before the glass, his sole urgent purpose was to locate the Stone to keep it from Quirrell and Voldemort, causing the mirror to deposit the physical stone directly into his pocket.",
      citations: [
        {
          id: "cit-stone-rag-2",
          number: 2,
          source_id: "src-ps-ch17-stone-pocket",
          excerpt:
            "His primary, desperate urge was not to brew elixir or hoard riches, but purely to find the Stone before Quirrell could lay hands on it. Seeing his own reflection smile and slip a blood-red stone into its coat pocket, Harry felt a sudden physical weight drop into his real pocket",
          start_offset: 86,
          end_offset: 367,
          structural_status: "verified",
          support_status: "supported",
        },
      ],
    },
  ],
  conclusion:
    "RAG cleanly identifies both the mechanism of the enchantment and the moment of physical retrieval, isolating Harry's unselfish motive as the sole key.",
  insufficient_evidence: false,
  context: {
    source_ids: ["src-ps-ch17-stone-enchantment", "src-ps-ch17-stone-pocket"],
    selected_source_count: 2,
    supplied_source_count: 4,
    strategy: "retrieved_passages",
    is_simulated: false,
  },
  metrics: {
    basis: "illustrative",
    latency_ms: 1190,
    input_tokens: 1480,
    output_tokens: 260,
    cached_input_tokens: 0,
    estimated_cost_usd: 0.00088,
    pricing_label: "$0.15/1M input · $0.60/1M output",
  },
  retrieval: PHILOSOPHERS_STONE_RETRIEVAL,
};

export const PHILOSOPHERS_STONE_FULL_BRANCH: ArchiveBranch = {
  id: "run-stone-full",
  method: "full_context",
  status: "complete",
  answer_title: "The Incorruptible Test of Intent",
  introduction:
    "Synthesizing the entire first chronicle reveals how the mirror's core nature — reflecting genuine internal desire rather than surface pretension — was weaponized into an impenetrable lock.",
  claims: [
    {
      id: "claim-stone-full-1",
      text: "Dumbledore's safeguard established an infallible discriminator: only a seeker who wanted to find the Stone without wanting to employ it for gold or eternal life could claim it.",
      citations: [
        {
          id: "cit-stone-full-1",
          number: 1,
          source_id: "src-ps-ch17-stone-enchantment",
          excerpt:
            "Only one who wanted to find the Stone — find it, and not use it — would be able to get it; anyone else would just see themselves making gold or drinking the Elixir of Life.",
          start_offset: 157,
          end_offset: 326,
          structural_status: "verified",
          support_status: "supported",
        },
      ],
    },
    {
      id: "claim-stone-full-2",
      text: "Harry's selfless motivation satisfied this condition: he sought only to prevent Quirrell from seizing the Stone, allowing his reflection to transfer the heavy ruby artifact into his pocket.",
      citations: [
        {
          id: "cit-stone-full-2",
          number: 2,
          source_id: "src-ps-ch17-stone-pocket",
          excerpt:
            "His primary, desperate urge was not to brew elixir or hoard riches, but purely to find the Stone before Quirrell could lay hands on it.",
          start_offset: 86,
          end_offset: 221,
          structural_status: "verified",
          support_status: "supported",
        },
      ],
    },
    {
      id: "claim-stone-full-3",
      text: "Because the mirror inherently exposes fundamental desire, Voldemort and Quirrell could not deceive it; their ambition to exploit the elixir rendered them permanently incapable of extracting the Stone.",
      citations: [
        {
          id: "cit-stone-full-3",
          number: 3,
          source_id: "src-ps-ch12-stone-longing",
          excerpt:
            "Because the mirror reflects true desire rather than spoken pretense, no charm, curse, or deceit could fool its glass. Quirrell and Voldemort failed because their consuming desire was to use the Stone",
          start_offset: 96,
          end_offset: 298,
          structural_status: "verified",
          support_status: "supported",
        },
      ],
    },
  ],
  conclusion:
    "Full-context attention demonstrates why Dumbledore's trap was unassailable: the mirror cannot be duped by verbal deceit because it reads intent directly, rewarding Harry's absence of greed.",
  insufficient_evidence: false,
  context: {
    source_ids: [
      "src-ps-ch17-stone-enchantment",
      "src-ps-ch17-stone-pocket",
      "src-ps-ch12-stone-longing",
    ],
    selected_source_count: 3,
    supplied_source_count: 1040,
    strategy: "complete_scope",
    is_simulated: false,
  },
  metrics: {
    basis: "illustrative",
    latency_ms: 9150,
    input_tokens: 78500,
    output_tokens: 420,
    cached_input_tokens: 61000,
    estimated_cost_usd: 0.199,
    pricing_label: "$2.50/1M input · $10.00/1M output",
  },
};

export const PHILOSOPHERS_STONE_RUN: ArchiveRun = {
  schema_version: "1.0",
  id: "run-philosophers-stone",
  question: PHILOSOPHERS_STONE_QUESTION,
  mode: "compare",
  data_mode: "mock",
  is_preview: false,
  created_at: new Date().toISOString(),
  status: "complete",
  configuration: {
    corpus_id: "harry-potter-archive",
    corpus_version: "vol-1-ps",
    scope_label: "Volume I · The Philosopher's Stone",
    model: "pensieve-dual-evaluator-v1",
    prompt_version: "v2.4-strict-provenance",
    output_limit: 800,
  },
  scopeVolumeIds: ["vol-1"],
  branches: [PHILOSOPHERS_STONE_RAG_BRANCH, PHILOSOPHERS_STONE_FULL_BRANCH],
  sources: PHILOSOPHERS_STONE_SOURCES,
};
```

---

#### C. `frontend/src/features/archive/mock/adapter.ts` Edit Specification
In `frontend/src/features/archive/mock/adapter.ts`:
1. Import `MIRROR_OF_ERISED_QUESTION`, `MIRROR_OF_ERISED_RUN` from `./mirror-of-erised`.
2. Import `PHILOSOPHERS_STONE_QUESTION`, `PHILOSOPHERS_STONE_RUN` from `./philosophers-stone`.
3. In `MOCK_CORPUS.examples`:
   ```typescript
   examples: [
     {
       id: "marauder",
       label: "The Marauder's Map",
       question: MARAUDERS_MAP_QUESTION,
     },
     {
       id: "mirror",
       label: "The Mirror of Erised",
       question: MIRROR_OF_ERISED_QUESTION,
     },
     {
       id: "stone",
       label: "The Philosopher's Stone",
       question: PHILOSOPHERS_STONE_QUESTION,
     },
   ],
   ```
4. In `createRun`:
   ```typescript
   async createRun(
     req: RunRequest,
     selectedVolumes: string[] = ["vol-3"],
   ): Promise<ArchiveRun> {
     const id = "run-" + Date.now() + "-" + ++sequence;
     const canonical = (question: string) =>
       question.trim().toLowerCase().replace(/[?!.]/g, "");

     const q = canonical(req.question);
     const methods: ("rag" | "full_context")[] =
       req.mode === "compare" ? ["rag", "full_context"] : [req.mode];

     // Scenario selector
     let baseRun: ArchiveRun | null = null;
     let requiredVolume = "vol-3";
     let volumeName = "The Prisoner of Azkaban";
     let volumeNum = "Volume III";

     if (q === canonical(MARAUDERS_MAP_QUESTION)) {
       baseRun = MARAUDERS_MAP_RUN;
       requiredVolume = "vol-3";
       volumeName = "The Prisoner of Azkaban";
       volumeNum = "Volume III";
     } else if (q === canonical(MIRROR_OF_ERISED_QUESTION)) {
       baseRun = MIRROR_OF_ERISED_RUN;
       requiredVolume = "vol-1";
       volumeName = "The Philosopher's Stone";
       volumeNum = "Volume I";
     } else if (q === canonical(PHILOSOPHERS_STONE_QUESTION)) {
       baseRun = PHILOSOPHERS_STONE_RUN;
       requiredVolume = "vol-1";
       volumeName = "The Philosopher's Stone";
       volumeNum = "Volume I";
     }

     if (baseRun && selectedVolumes.includes(requiredVolume)) {
       return remember({
         ...baseRun,
         id,
         mode: req.mode,
         question: req.question.trim(),
         is_preview: false,
         data_mode: "mock",
         created_at: new Date().toISOString(),
         scopeVolumeIds: [requiredVolume],
         branches: baseRun.branches
           .filter((branch) => methods.includes(branch.method))
           .map((branch) => ({
             ...branch,
             context: { ...branch.context, is_simulated: true },
             claims: branch.claims.map((claim) => ({
               ...claim,
               citations: claim.citations.map((citation) => {
                 const source = baseRun!.sources.find(
                   (item) => item.id === citation.source_id,
                 );
                 const start = source?.text.indexOf(citation.excerpt) ?? -1;
                 return start < 0
                   ? citation
                   : {
                       ...citation,
                       start_offset: start,
                       end_offset: start + citation.excerpt.length,
                     };
               }),
             })),
           })),
       });
     }

     const introduction = baseRun
       ? `The prepared investigation belongs to ${volumeNum}. Select ${volumeName} to consult its evidence.`
       : "This archive demonstration contains prepared investigations of the Marauder's Map, the Mirror of Erised, and the Philosopher's Stone. This question has no prepared answer.";

     const branches: ArchiveBranch[] = methods.map((method) => ({
       id: id + "-" + method,
       method,
       status: "complete",
       answer_title: "Uncatalogued Inquiry",
       introduction,
       claims: [],
       conclusion: baseRun
         ? `Choose ${volumeName} from the collection proxies to explore the prepared investigation.`
         : "Choose one of the catalogued suggestions to explore a prepared investigation.",
       insufficient_evidence: true,
       context: {
         source_ids: [],
         selected_source_count: 0,
         supplied_source_count: 0,
         strategy: method === "rag" ? "retrieved_passages" : "complete_scope",
         is_simulated: true,
       },
       metrics: {
         basis: "illustrative",
         latency_ms: null,
         input_tokens: null,
         output_tokens: null,
         estimated_cost_usd: null,
       },
     }));

     return remember({
       schema_version: "1.0",
       id,
       question: req.question,
       mode: req.mode,
       data_mode: "mock",
       is_preview: false,
       created_at: new Date().toISOString(),
       status: "complete",
       configuration: {
         corpus_id: req.corpus_id,
         corpus_version: req.corpus_version,
         scope_label: "Selected demonstration volumes",
         model: "prepared-demonstration",
         prompt_version: "v2.4-strict-provenance",
         output_limit: 800,
       },
       scopeVolumeIds: selectedVolumes,
       branches,
       sources: [],
     });
   }
   ```

---

#### D. `frontend/src/features/archive/ui/QuestionLeaf.tsx` Enhancement
In `QuestionLeaf.tsx`:
1. Import `MIRROR_OF_ERISED_QUESTION` and `PHILOSOPHERS_STONE_QUESTION`.
2. Connect `selectSingleVolume = useArchiveStore((s) => s.selectSingleVolume)`.
3. In `suggestions`:
   ```typescript
   const suggestions = [
     {
       label: "The Marauder's Map",
       q: MARAUDERS_MAP_QUESTION,
       volumeId: "vol-3",
     },
     {
       label: "The Mirror of Erised",
       q: MIRROR_OF_ERISED_QUESTION,
       volumeId: "vol-1",
     },
     {
       label: "The Philosopher's Stone",
       q: PHILOSOPHERS_STONE_QUESTION,
       volumeId: "vol-1",
     },
   ];
   ```
4. In suggestion pill button `onClick`:
   ```typescript
   onClick={() => {
     setQuestion(item.q);
     if (!selectedVolumeIds.includes(item.volumeId)) {
       selectSingleVolume(item.volumeId);
     }
   }}
   ```
5. In `handleSubmit`:
   ```typescript
   const isVol1 = selectedVolumeIds.includes("vol-1") && !selectedVolumeIds.includes("vol-3");
   await submitInquiry(
     {
       question: question.trim(),
       mode,
       corpus_id: "harry-potter-archive",
       corpus_version: isVol1 ? "vol-1-ps" : "vol-3-poa",
     },
     selectedVolumeIds,
   );
   ```

---

## 2. Feature F4: Corpus Identifier Contracts & State Persistence

### 2.1 Context & Problem Statement
1. **Contract Desynchronization**:
   Frontend passes `corpus_id: "harry-potter-archive"`. The backend FastAPI service in `backend/app/demo/catalog.py` defines `wizarding-notes` and `lantern-ledger`. If `createHttpInquiryTransport` contacts `POST /api/runs`, FastAPI raises HTTP 422: `"The selected collection is not available."`
2. **State Persistence Loss**:
   In `backend/app/experiments.py`:
   - `service.cancel(run_id)` updates `run.status = "cancelled"` in memory and calls `self.repository.save(run)`. However, if `run` had already finished, `view()` was never saved as complete in `self.repository`.
   - `service.view(run_id)` computes elapsed time and transitions `run.status` to `"complete"` when all branches finish, but **never calls `self.repository.save(run)`**. As a result, subsequent repository reads (e.g., across restarts, database reloads, or direct repository lookups) return the run stuck in `"running"`.

### 2.2 Proposed Architecture
1. **Corpus Contract Synchronization**:
   - Add `harry-potter-archive` with version `"vol-3-poa"` to `backend/app/demo/catalog.py` in `CORPORA`.
   - Keep `wizarding-notes` as `CORPORA[0]` so all existing backend tests that reference `CORPORA[0]` remain 100% stable without alteration.
   - Populate `SOURCES` in `catalog.py` with the four canonical Marauder's Map passages (`src-poa-ch10-gift`, `src-poa-ch10-creators`, `src-poa-ch18-identities`, `src-poa-ch22-return`) under `corpus_id="harry-potter-archive"`.
   - In `backend/app/demo/scenarios.py`, implement `elif key == "marauder":` in `make_branch()`. All claims and quotations match exact verbatim substrings of the sources.
   - In `backend/app/experiments.py`, allow `"vol-3-poa"`, `"vol-1-ps"`, and `"1997-2007-chronicles"` as valid versions for `"harry-potter-archive"` to avoid false 422 rejections.
2. **Experiment Completion Persistence**:
   - In `backend/app/experiments.py` `view()`:
     - Check `if run is None or run.is_preview or run.status in ("complete", "cancelled"): return run`. If already finalized, avoid redundant re-simulation.
     - When `run.status` evaluates to `"complete"`, invoke `self.repository.save(run)`.
   - In `cancel()`:
     - Preserves `self.repository.save(run)` when cancelling an in-flight run.

---

### 2.3 Exact Code Edits for F4

#### A. `backend/app/demo/catalog.py`
```python
from app.contracts import Corpus, ExampleQuestion, SourcePassage

CORPUS_VERSION = "demo-2026-10-05"

CORPORA = [
    Corpus(
        id="wizarding-notes",
        version=CORPUS_VERSION,
        title="Harry Potter · companion notes",
        subtitle="An original reading companion",
        edition="Pensieve companion notes · demonstration edition",
        source_kind="original_companion_notes",
        book_count=1,
        source_count=4,
        examples=[
            ExampleQuestion(
                id="mirror",
                label="The Mirror of Erised",
                question="What does the Mirror of Erised reveal, and why is it dangerous?",
            ),
            ExampleQuestion(
                id="stone",
                label="The Philosopher’s Stone",
                question="Why can Harry retrieve the Philosopher’s Stone from the mirror?",
            ),
            ExampleQuestion(
                id="unknown",
                label="Test the archive’s limits",
                question="What is the exact recipe for making a Philosopher’s Stone?",
            ),
        ],
    ),
    Corpus(
        id="lantern-ledger",
        version=CORPUS_VERSION,
        title="The Lantern Ledger",
        subtitle="An original tale from the archive",
        edition="The Lantern Ledger · original fixture edition",
        source_kind="original_fiction",
        book_count=1,
        source_count=3,
        examples=[
            ExampleQuestion(
                id="lantern",
                label="The blue lantern",
                question="Why does the archive’s lantern turn blue at midnight?",
            ),
            ExampleQuestion(
                id="keeper",
                label="The keeper’s promise",
                question="What promise does the keeper make to the archive?",
            ),
            ExampleQuestion(
                id="unknown",
                label="Test the archive’s limits",
                question="Who built the first observatory on the moon?",
            ),
        ],
    ),
    Corpus(
        id="harry-potter-archive",
        version="vol-3-poa",
        title="The Chronicles of Hogwarts",
        subtitle="Seven enchanted tomes of magical history",
        edition="Pensieve Archive · Third Volume Edition",
        source_kind="ingested_edition",
        book_count=7,
        source_count=4,
        examples=[
            ExampleQuestion(
                id="marauder",
                label="The Marauder's Map",
                question="How did Harry come to own the Marauder's Map, and who created it?",
            ),
        ],
    ),
]


def passage(
    corpus_id: str,
    source_id: str,
    book: str,
    short: str,
    chapter: str,
    number: int,
    folio: str,
    text: str,
) -> SourcePassage:
    corpus = next(item for item in CORPORA if item.id == corpus_id)
    return SourcePassage(
        id=source_id,
        corpus_id=corpus_id,
        corpus_version=corpus.version,
        book=book,
        book_short=short,
        edition=corpus.edition,
        chapter=chapter,
        chapter_number=number,
        page_label=f"Demo folio {folio}" if corpus_id != "harry-potter-archive" else folio,
        page_kind="demo_folio",
        text=text,
        attribution=(
            "Original paraphrased demonstration passage · Volume III"
            if corpus_id == "harry-potter-archive"
            else (
                "Original companion prose written for this demonstration; not an excerpt "
                "or page reference from the novels."
                if corpus_id == "wizarding-notes"
                else "Original fiction written for the Pensieve demonstration."
            )
        ),
    )


SOURCES = [
    # Wizarding Notes Passages ...
    passage(
        "wizarding-notes",
        "mirror-desire",
        "A companion to the Philosopher’s Stone",
        "Philosopher’s Stone · notes",
        "The Mirror of Erised",
        1,
        "17",
        "The Mirror of Erised does not show the world as it is. It reflects the deepest "
        "desire of the person looking into it. Harry sees his family beside him, while Ron "
        "sees himself distinguished and admired. The same glass reveals different longings.",
    ),
    passage(
        "wizarding-notes",
        "mirror-warning",
        "A companion to the Philosopher’s Stone",
        "Philosopher’s Stone · notes",
        "The Headmaster’s Warning",
        2,
        "23",
        "Dumbledore explains that the mirror offers neither knowledge nor truth. A person "
        "can become absorbed in what it promises, neglecting the life beyond the glass. "
        "Its danger lies in mistaking a desired life for a life actually lived.",
    ),
    passage(
        "wizarding-notes",
        "mirror-stone",
        "A companion to the Philosopher’s Stone",
        "Philosopher’s Stone · notes",
        "The Final Safeguard",
        3,
        "41",
        "The final safeguard rewards a particular intention: someone who wants to find the "
        "Stone, but does not want to use it, can obtain it through the mirror. Harry’s purpose "
        "is to keep it from the wrong hands. His reflection receives the Stone, and it "
        "appears in his pocket.",
    ),
    passage(
        "wizarding-notes",
        "mirror-pattern",
        "A companion to the Philosopher’s Stone",
        "Philosopher’s Stone · notes",
        "Desire and Choice",
        4,
        "45",
        "The mirror first exposes a private longing and later tests the intention behind a "
        "choice. Read together, these moments distinguish wanting an image from acting "
        "with purpose. The companion leaves the manufacture of the Stone unexplained.",
    ),
    # Lantern Ledger Passages ...
    passage(
        "lantern-ledger",
        "lantern-color",
        "The Lantern Ledger",
        "The Lantern Ledger",
        "The Midnight Bell",
        1,
        "03",
        "At midnight, the archive’s lantern turns blue when a reader has left a question "
        "unanswered. Its flame remains blue until the keeper places a matching source "
        "leaf beside the question. The light marks an unfinished connection, not a danger.",
    ),
    passage(
        "lantern-ledger",
        "lantern-source",
        "The Lantern Ledger",
        "The Lantern Ledger",
        "A Leaf for Every Question",
        2,
        "08",
        "The keeper searches the shelves for a leaf that supports the waiting question. "
        "When the leaf is laid on the desk, a silver thread joins the question to its ink. "
        "Only then does the lantern return to its warm amber glow.",
    ),
    passage(
        "lantern-ledger",
        "keeper-promise",
        "The Lantern Ledger",
        "The Lantern Ledger",
        "The Keeper’s Promise",
        3,
        "12",
        "The keeper promises to preserve every leaf in its original order, to name the "
        "source of every answer, and to leave unsupported questions open. The archive "
        "values an honest silence more than a beautifully invented answer.",
    ),
    # Harry Potter Archive Passages (Volume III) ...
    passage(
        "harry-potter-archive",
        "src-poa-ch10-gift",
        "The Prisoner of Azkaban",
        "Azkaban",
        "The Marauder's Map",
        10,
        "192",
        "Fred and George pulled Harry into an empty classroom before the Hogsmeade excursion. They unfurled a square, worn parchment that appeared completely blank, explaining that they had nicked it from Argus Filch's filing cabinet during their first winter at the school. Touching their wand tip to the center, they whispered the oath of mischief, causing delicate ink veins to spread across the sheet until every tower, dungeon, and secret passage of the castle appeared, traced by tiny moving labels indicating wandering persons.",
    ),
    passage(
        "harry-potter-archive",
        "src-poa-ch10-creators",
        "The Prisoner of Azkaban",
        "Azkaban",
        "The Marauder's Map",
        10,
        "193",
        "Across the header in ornate cursive flourished the title: Messrs Moony, Wormtail, Padfoot, and Prongs, Purveyors of Aids to Magical Mischief-Makers, are proud to present the Marauder's Map. George informed Harry that these four unidentified scholars were noble pioneers who had mapped the school grounds in secret decades earlier, and that the twins felt it their solemn obligation to pass such a legacy directly to him.",
    ),
    passage(
        "harry-potter-archive",
        "src-poa-ch18-identities",
        "The Prisoner of Azkaban",
        "Azkaban",
        "Moony, Wormtail, Padfoot, and Prongs",
        18,
        "355",
        "Within the ruined chamber of the Shrieking Shack, Professor Remus Lupin revealed the true identity of the four cartographers. He was Moony, so titled due to his monthly lycanthropic torment. James Potter transformed into a great stag and earned the name Prongs; Sirius Black became a massive black dog known as Padfoot; and Peter Pettigrew assumed the shape of a rat called Wormtail. They mastered illicit animagus transformations in their fifth year to wander the grounds freely under moonlight and forged the map to record every boundary.",
    ),
    passage(
        "harry-potter-archive",
        "src-poa-ch22-return",
        "The Prisoner of Azkaban",
        "Azkaban",
        "Owl Post Again",
        22,
        "423",
        "Packing his trunks after tendering his resignation, Professor Lupin summoned Harry into his vacated study. Along with the Invisibility Cloak, Lupin placed the blank Marauder's Map back into Harry's hands. Lupin remarked that having surrendered his post as instructor, he felt no lingering compunction against returning the enchanted parchment created by Harry's father and his companions.",
    ),
]
```

---

#### B. `backend/app/demo/scenarios.py`
In `backend/app/demo/scenarios.py`, add `elif key == "marauder":` to `make_branch`:
```python
    elif key == "marauder":
        title = (
            "The Bequest of the Four Wanderers"
            if rag
            else "The Complete Provenance of the Parchment"
        )
        introduction = (
            "Through selective vector retrieval of the third chronicle, the origin and authorship of the parchment resolve across three decisive encounters."
            if rag
            else "Holding the entire third volume within active attention reveals both the original gift and the complete narrative arc of the map's ownership."
        )
        claims = [
            (
                "Harry acquired the Marauder's Map during his third year when Fred and George Weasley gifted it to him in an abandoned classroom, having stolen it from Filch's office four years prior.",
                "src-poa-ch10-gift",
                "Fred and George pulled Harry into an empty classroom before the Hogsmeade excursion. They unfurled a square, worn parchment that appeared completely blank, explaining that they had nicked it from Argus Filch's filing cabinet during their first winter at the school.",
            ),
            (
                "The parchment was inscribed by four enigmatic creators styling themselves Messrs Moony, Wormtail, Padfoot, and Prongs, Purveyors of Aids to Magical Mischief-Makers.",
                "src-poa-ch10-creators",
                "Messrs Moony, Wormtail, Padfoot, and Prongs, Purveyors of Aids to Magical Mischief-Makers, are proud to present the Marauder's Map.",
            ),
            (
                "The four creators were revealed as Remus Lupin (Moony), Peter Pettigrew (Wormtail), Sirius Black (Padfoot), and James Potter (Prongs), who created it after learning animagus transformations.",
                "src-poa-ch18-identities",
                "He was Moony, so titled due to his monthly lycanthropic torment. James Potter transformed into a great stag and earned the name Prongs; Sirius Black became a massive black dog known as Padfoot; and Peter Pettigrew assumed the shape of a rat called Wormtail.",
            ),
        ]
        if not rag:
            claims.append(
                (
                    "Crucially, after Lupin later confiscated the map during the term, he formally restored it to Harry in his private study upon resigning, cementing Harry's permanent ownership.",
                    "src-poa-ch22-return",
                    "Along with the Invisibility Cloak, Lupin placed the blank Marauder's Map back into Harry's hands. Lupin remarked that having surrendered his post as instructor, he felt no lingering compunction against returning the enchanted parchment created by Harry's father and his companions.",
                )
            )
        conclusion = (
            "RAG successfully isolated the moment of bestowal and the revelation of authorship, but its retrieval boundary excluded the parchment's subsequent confiscation and final return."
            if rag
            else "Full context synthesized the entire timeline: discovery, transmission, secret revelation, and Lupin's closing restoration — at the expense of ~58× higher token volume."
        )
```

---

#### C. `backend/app/experiments.py`
In `backend/app/experiments.py`:
```python
    def create(self, request: RunRequest, preview: bool = False) -> ExperimentRun:
        corpus = get_corpus(request.corpus_id)
        if corpus is None:
            raise ValueError("The selected collection is not available.")
        valid_versions = {corpus.version}
        if corpus.id == "harry-potter-archive":
            valid_versions.update({"vol-1-ps", "vol-3-poa", "1997-2007-chronicles"})
        if request.corpus_version not in valid_versions:
            raise ValueError("The collection version has changed. Select the collection again.")
        run_id = str(uuid4())
        methods = (
            [Method.RAG, Method.FULL_CONTEXT]
            if request.mode == Mode.COMPARE
            else [Method(request.mode.value)]
        )
        run = ExperimentRun(
            id=run_id,
            question=request.question,
            mode=request.mode,
            data_mode="mock",
            is_preview=preview,
            created_at=datetime.now(UTC),
            status="complete" if preview else "running",
            configuration=RunConfiguration(
                corpus_id=corpus.id,
                corpus_version=request.corpus_version,
                scope_label=f"All {corpus.source_count} companion passages"
                if corpus.id == "wizarding-notes"
                else f"All {corpus.source_count} original passages",
                model="Prepared demonstration",
                prompt_version="demo-v1",
                output_limit=512,
            ),
            branches=[
                make_branch(corpus.id, request.question, method, run_id) for method in methods
            ],
            sources=corpus_sources(corpus.id),
        )
        self.repository.save(run)
        return self.view(run_id) or run

    def view(self, run_id: str) -> ExperimentRun | None:
        run = self.repository.get(run_id)
        if run is None or run.is_preview or run.status in ("complete", "cancelled"):
            return run
        elapsed = (datetime.now(UTC) - run.created_at).total_seconds()
        for branch in run.branches:
            complete_at = 1.45 if branch.method == Method.RAG else 2.8
            if elapsed >= complete_at:
                branch.status = BranchStatus.COMPLETE
                continue
            branch.status = (
                BranchStatus.QUEUED
                if elapsed < 0.2
                else BranchStatus.PREPARING
                if elapsed < 0.65
                else BranchStatus.GENERATING
                if elapsed < complete_at - 0.3
                else BranchStatus.VALIDATING
            )
            branch.claims = []
            branch.introduction = ""
            branch.conclusion = ""
            branch.metrics = RunMetrics(basis="illustrative")
        run.status = (
            "complete"
            if all(branch.status == BranchStatus.COMPLETE for branch in run.branches)
            else "running"
        )
        if run.status == "complete":
            self.repository.save(run)
        return run

    def cancel(self, run_id: str) -> ExperimentRun | None:
        run = self.view(run_id)
        if run is None or run.status != "running":
            return run
        run.status = "cancelled"
        for branch in run.branches:
            if branch.status != BranchStatus.COMPLETE:
                branch.status = BranchStatus.CANCELLED
                branch.claims = []
                branch.introduction = ""
                branch.conclusion = ""
                branch.metrics = RunMetrics(basis="unavailable")
        self.repository.save(run)
        return run
```

---

## 3. Automated Verification Strategy

### 3.1 Backend Tests (`backend/tests/test_archive.py`)
Add two targeted unit tests:
```python
def test_completed_run_persists_to_repository():
    repository = MemoryRunRepository()
    service = ExperimentService(repository)
    run = service.create(
        RunRequest(
            question=CORPORA[0].examples[0].question,
            corpus_id=CORPORA[0].id,
            corpus_version=CORPORA[0].version,
        )
    )
    # Simulate elapsed time beyond completion threshold (2.8s)
    snapshot = repository.get(run.id)
    snapshot.created_at = datetime.now(UTC) - timedelta(seconds=3.0)
    repository.save(snapshot)

    completed = service.view(run.id)
    assert completed.status == "complete"
    assert all(branch.status == "complete" for branch in completed.branches)

    # Verify state was persisted directly to the repository
    stored = repository.get(run.id)
    assert stored is not None
    assert stored.status == "complete"


def test_cancel_persists_to_repository():
    repository = MemoryRunRepository()
    service = ExperimentService(repository)
    run = service.create(
        RunRequest(
            question=CORPORA[0].examples[0].question,
            corpus_id=CORPORA[0].id,
            corpus_version=CORPORA[0].version,
        )
    )
    cancelled = service.cancel(run.id)
    assert cancelled.status == "cancelled"

    # Verify state was persisted directly to the repository
    stored = repository.get(run.id)
    assert stored is not None
    assert stored.status == "cancelled"
```
Execute with:
```powershell
.venv\Scripts\pytest
```
*Expected*: All 14 tests pass (13 existing + 2 new; or 15+ if parametrized).

### 3.2 Frontend Unit Tests (`frontend/tests/inquiry-unit.mjs`)
Extend `inquiry-unit.mjs` to assert:
1. `mockArchiveAdapter.createRun` with `MIRROR_OF_ERISED_QUESTION` and `["vol-1"]`:
   - Returns 3 sources with `book_short: "Stone"`.
   - Returns 2 branches (RAG & Full Context) with `insufficient_evidence === false`.
   - Citation offsets match verbatim substrings: `source.text.slice(c.start_offset, c.end_offset) === c.excerpt`.
   - `memoryFragments` returns source fragments with label starting with `PREPARED PARAPHRASE · Stone`.
2. `mockArchiveAdapter.createRun` with `PHILOSOPHERS_STONE_QUESTION` and `["vol-1"]`:
   - Returns 3 sources with `book_short: "Stone"`.
   - Returns 2 branches with verified claims and exact citation offsets.
3. Scope enforcement:
   - Requesting `MIRROR_OF_ERISED_QUESTION` with only `["vol-3"]` returns 0 sources and helpful guidance.
   - Requesting `MARAUDERS_MAP_QUESTION` with only `["vol-1"]` returns 0 sources and helpful guidance.
4. Evidence retrieval:
   - `mockArchiveAdapter.getEvidence(runId, "cit-mirror-rag-1")` returns the exact claim and source.
   - `mockArchiveAdapter.getEvidence(runId, "cit-stone-rag-1")` returns the exact claim and source.

Execute with:
```powershell
node tests/inquiry-unit.mjs
npm run typecheck
```
*Expected*: Exit code 0, 0 errors.

---

## 4. Implementation Readiness & Dependency Notes

- **Interface Compatibility**:
  - The contracts `InquiryResponse`, `ArchiveRun`, `ArchiveBranch`, `SourcePassage`, and `Citation` are preserved with zero breaking schema modifications.
  - `MOCK_CORPUS` in `adapter.ts` remains intact while expanding `examples` to include all 3 catalogued curiosity questions.
- **Milestone 2 & 3 Handshake**:
  - The new scenario copy is drafted in grounded, authentic archival prose, anticipating Requirement R2.
  - Token counts and latency metrics align precisely with the responsive `GutterScale` and `TwinTomes` layout.
