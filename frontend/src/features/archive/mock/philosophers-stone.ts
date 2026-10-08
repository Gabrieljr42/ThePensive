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
    usage_status: "unknown",
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
    usage_status: "unknown",
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
