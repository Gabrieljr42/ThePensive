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
    usage_status: "unknown",
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
    usage_status: "unknown",
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
