import { create } from "zustand";
import type { Corpus, EvidenceResponse, Mode } from "@/lib/contracts";
import {
  hasReadableAnswer,
  type ArchiveRun,
  type ScenePhase,
  type Volume,
  type DivePhase,
} from "./model";
import { ARCHIVE_VOLUMES } from "./mock/volumes";
import { MARAUDERS_MAP_QUESTION } from "./mock/marauders-map";
import { MIRROR_OF_ERISED_QUESTION } from "./mock/mirror-of-erised";
import { PHILOSOPHERS_STONE_QUESTION } from "./mock/philosophers-stone";
import { availableChapters, bookIsAvailable } from "./scope";
import {
  createArchiveQualityState,
  noteDetectedTier,
  noteReducedMotion,
  noteSceneMounted,
  type ArchiveQualityState,
  type ArchiveTier,
} from "./archiveBudget";

interface ArchiveState {
  corpus: Corpus | null;
  publicMode: boolean;
  availability: "checking" | "live" | "demo" | "unavailable";
  availabilityError: string | null;
  fullContextTokenLimit: number;
  publicChapterLimit: number;
  setAvailability: (
    availability: ArchiveState["availability"],
    message?: string | null,
  ) => void;
  selectedChapterIds: string[];
  setSelectedChapters: (ids: string[]) => void;
  loadCorpus: (
    corpus: Corpus,
    publicMode: boolean,
    fullContextTokenLimit?: number,
    publicChapterLimit?: number,
  ) => void;
  phase: ScenePhase;
  volumes: Volume[];
  selectedVolumeIds: string[];
  hoveredVolumeId: string | null;
  mode: Mode;
  question: string;
  isCustomQuestion: boolean;
  run: ArchiveRun | null;
  activeCitationId: string | null;
  pinnedCitationId: string | null;
  activeEvidence: EvidenceResponse | null;
  reducedMotion: boolean;
  qualityTier: ArchiveTier;
  qualityGate: ArchiveQualityState;
  isBusy: boolean;
  requestId: number;
  error: string | null;
  quietReading: boolean;
  lightMode: boolean;
  divePhase: DivePhase;
  diveCount: number;
  journeyPaused: boolean;
  inquiryStartedAt: number | null;
  connection: "connected" | "reconnecting";
  sceneAvailable: boolean;
  firstReadableMethod: "rag" | "full_context" | null;

  // Actions
  setPhase: (phase: ScenePhase) => void;
  toggleVolume: (id: string) => void;
  selectSingleVolume: (id: string) => void;
  setHoveredVolume: (id: string | null) => void;
  setMode: (mode: Mode) => void;
  setQuestion: (question: string) => void;
  setRun: (run: ArchiveRun | null) => void;
  setActiveCitation: (id: string | null) => void;
  setPinnedCitation: (id: string | null) => void;
  setActiveEvidence: (evidence: EvidenceResponse | null) => void;
  setReducedMotion: (reduced: boolean) => void;
  setQualityTier: (tier: ArchiveTier) => void;
  markSceneMounted: () => void;
  setIsBusy: (busy: boolean) => void;
  resetToDesk: () => void;
  beginInquiry: () => number;
  completeInquiry: (id: number, run: ArchiveRun) => boolean;
  failInquiry: (id: number, message: string) => void;
  cancelInquiry: () => void;
  setQuietReading: (quiet: boolean) => void;
  setLightMode: (light: boolean) => void;
  updateInquiry: (
    id: number,
    run: ArchiveRun,
    connection?: "connected" | "reconnecting",
  ) => boolean;
  setDivePhase: (id: number, phase: DivePhase) => void;
  markDive: () => void;
  setSceneAvailable: (available: boolean) => void;
  setJourneyPaused: (paused: boolean) => void;
}

export const useArchiveStore = create<ArchiveState>((set) => ({
  corpus: null,
  publicMode: false,
  availability: "checking",
  availabilityError: null,
  fullContextTokenLimit: 0,
  publicChapterLimit: 30,
  setAvailability: (availability, availabilityError = null) =>
    set(availability === "demo"
      ? {
          availability,
          availabilityError,
          corpus: null,
          publicMode: false,
          fullContextTokenLimit: 0,
          publicChapterLimit: 30,
          selectedChapterIds: [],
          selectedVolumeIds: ["vol-3"],
          volumes: ARCHIVE_VOLUMES,
        }
      : { availability, availabilityError }),
  selectedChapterIds: [],
  setSelectedChapters: (selectedChapterIds) => set((state) => ({
    selectedChapterIds: state.corpus
      ? selectedChapterIds.filter((id) =>
          state.selectedVolumeIds.some((bookId) =>
            availableChapters(state.corpus!, bookId, state.mode).some((chapter) => chapter.id === id),
          ),
        )
      : selectedChapterIds,
  })),
  loadCorpus: (corpus, publicMode, fullContextTokenLimit = 0, publicChapterLimit = 30) => set((state) => {
    const books = corpus.books ?? [];
    const first = books.find((book) => bookIsAvailable(corpus, book.id, state.mode));
    return {
      corpus,
      publicMode,
      fullContextTokenLimit,
      publicChapterLimit,
      availability: "live",
      availabilityError: null,
      selectedVolumeIds: first ? [first.id] : [],
      selectedChapterIds: first
        ? availableChapters(corpus, first.id, state.mode).slice(0, 3).map((chapter) => chapter.id)
        : [],
      question: "How do the Dursleys react to the letters addressed to Harry?",
      isCustomQuestion: true,
      volumes: state.volumes.map((volume) => {
        const book = books.find((item) => item.id === volume.id);
        if (!book) return { ...volume, indexing: "pending" as const };
        const sourceChapters = book.chapters.filter((chapter) => chapter.source_count > 0);
        return {
          ...volume,
          title: book.title,
          pages: book.chapters.reduce((sum, chapter) => sum + chapter.source_count, 0),
          chapters: book.chapters.length,
          chunks: book.chapters.reduce((sum, chapter) => sum + chapter.chunk_count, 0),
          tokens: book.chapters.reduce((sum, chapter) => sum + chapter.estimated_tokens, 0),
          indexing: sourceChapters.length > 0 && sourceChapters.every((chapter) => chapter.indexed)
            ? "indexed" as const
            : "pending" as const,
        };
      }),
    };
  }),
  phase: "dark",
  volumes: ARCHIVE_VOLUMES,
  selectedVolumeIds: ["vol-3"], // Volume III (Prisoner of Azkaban) selected by default
  hoveredVolumeId: null,
  mode: "compare",
  question: MARAUDERS_MAP_QUESTION,
  isCustomQuestion: false,
  run: null,
  activeCitationId: null,
  pinnedCitationId: null,
  activeEvidence: null,
  reducedMotion: false,
  qualityTier: "mid",
  qualityGate: createArchiveQualityState(),
  isBusy: false,
  requestId: 0,
  error: null,
  quietReading: false,
  lightMode: false,
  divePhase: "idle",
  diveCount: 0,
  journeyPaused: false,
  inquiryStartedAt: null,
  connection: "connected",
  sceneAvailable: true,
  firstReadableMethod: null,

  setPhase: (phase) => set({ phase }),

  toggleVolume: (id) =>
    set((state) => {
      if (state.corpus && !bookIsAvailable(state.corpus, id, state.mode)) return state;
      const exists = state.selectedVolumeIds.includes(id);
      if (exists) {
        // Keep at least one volume selected
        if (state.selectedVolumeIds.length === 1) return state;
        return {
          selectedVolumeIds: state.selectedVolumeIds.filter((v) => v !== id),
          selectedChapterIds: state.selectedChapterIds.filter((chapter) => !chapter.startsWith(id + "-ch-")),
        };
      }
      return { selectedVolumeIds: [...state.selectedVolumeIds, id] };
    }),

  selectSingleVolume: (id) => set((state) => {
    if (state.corpus && !bookIsAvailable(state.corpus, id, state.mode)) return state;
    const chapters = state.corpus ? availableChapters(state.corpus, id, state.mode) : [];
    const retained = state.selectedChapterIds.filter((chapter) =>
      state.corpus
        ? chapters.some((candidate) => candidate.id === chapter)
        : chapter.startsWith(id + "-ch-"),
    );
    return {
      selectedVolumeIds: [id],
      selectedChapterIds: retained.length
        ? retained
        : chapters.slice(0, 3).map((chapter) => chapter.id),
    };
  }),

  setHoveredVolume: (id) => set({ hoveredVolumeId: id }),

  setMode: (mode) => set((state) => {
    if (!state.corpus) return { mode };
    const selectedVolumeIds = state.selectedVolumeIds.filter((id) =>
      bookIsAvailable(state.corpus!, id, mode),
    );
    const nextVolumeIds = selectedVolumeIds.length
      ? selectedVolumeIds
      : (state.corpus.books ?? [])
          .filter((book) => bookIsAvailable(state.corpus!, book.id, mode))
          .slice(0, 1)
          .map((book) => book.id);
    let selectedChapterIds = state.selectedChapterIds.filter((id) =>
      nextVolumeIds.some((bookId) =>
        availableChapters(state.corpus!, bookId, mode).some((chapter) => chapter.id === id),
      ),
    );
    if (state.selectedChapterIds.length && !selectedChapterIds.length && nextVolumeIds[0]) {
      selectedChapterIds = availableChapters(state.corpus, nextVolumeIds[0], mode)
        .slice(0, 3)
        .map((chapter) => chapter.id);
    }
    return { mode, selectedVolumeIds: nextVolumeIds, selectedChapterIds };
  }),

  setQuestion: (question) =>
    set({
      question,
      isCustomQuestion: ![
        MARAUDERS_MAP_QUESTION,
        MIRROR_OF_ERISED_QUESTION,
        PHILOSOPHERS_STONE_QUESTION,
      ].includes(question.trim()),
    }),

  setRun: (run) => set({ run }),

  setActiveCitation: (id) => set({ activeCitationId: id }),

  setPinnedCitation: (id) => set({ pinnedCitationId: id }),

  setActiveEvidence: (activeEvidence) => set({ activeEvidence }),

  setReducedMotion: (reducedMotion) =>
    set((state) => {
      const qualityGate = noteReducedMotion(state.qualityGate, reducedMotion);
      if (
        reducedMotion === state.reducedMotion &&
        qualityGate.tier === state.qualityTier &&
        qualityGate.pendingHigh === state.qualityGate.pendingHigh
      ) {
        return state;
      }
      return { reducedMotion, qualityGate, qualityTier: qualityGate.tier };
    }),

  setQualityTier: (detected) =>
    set((state) => {
      const qualityGate = noteDetectedTier(state.qualityGate, detected);
      if (
        qualityGate.tier === state.qualityTier &&
        qualityGate.pendingHigh === state.qualityGate.pendingHigh
      ) {
        return state;
      }
      return { qualityGate, qualityTier: qualityGate.tier };
    }),

  markSceneMounted: () =>
    set((state) => {
      const qualityGate = noteSceneMounted(state.qualityGate);
      if (qualityGate === state.qualityGate) return state;
      if (
        qualityGate.mounted === state.qualityGate.mounted &&
        qualityGate.tier === state.qualityTier &&
        qualityGate.pendingHigh === state.qualityGate.pendingHigh
      ) {
        return state;
      }
      return { qualityGate, qualityTier: qualityGate.tier };
    }),

  setIsBusy: (isBusy) => set({ isBusy }),

  beginInquiry: () => {
    let id = 0;
    set((state) => {
      id = state.requestId + 1;
      return {
        requestId: id,
        isBusy: true,
        error: null,
        run: null,
        activeCitationId: null,
        pinnedCitationId: null,
        activeEvidence: null,
        phase: "casting",
        inquiryStartedAt: Date.now(),
        firstReadableMethod: null,
        journeyPaused: false,
        connection: "connected",
      };
    });
    return id;
  },
  completeInquiry: (id, run) => {
    let accepted = false;
    set((state) => {
      if (state.requestId !== id) return state;
      accepted = true;
      return { run, isBusy: false, phase: "reading", error: null };
    });
    return accepted;
  },
  updateInquiry: (id, run, connection = "connected") => {
    let accepted = false;
    set((state) => {
      if (state.requestId !== id) return state;
      accepted = true;
      const readable = hasReadableAnswer(run);
      const busy = run.status === "running";
      return {
        run,
        isBusy: busy,
        connection,
        firstReadableMethod:
          state.firstReadableMethod ??
          run.branches.find(
            (branch) =>
              branch.status === "complete" ||
              branch.introduction ||
              branch.claims.length,
          )?.method ??
          null,
        phase:
          state.phase === "evidence" && readable
            ? "evidence"
            : readable
              ? "reading"
              : busy
                ? "retrieving"
                : "desk",
        error:
          run.status === "failed"
            ? "The archive could not complete either method. Try again."
            : null,
      };
    });
    return accepted;
  },
  setDivePhase: (id, divePhase) =>
    set((state) =>
      state.requestId === id
        ? {
            divePhase,
            ...(divePhase === "idle" || divePhase === "arriving"
              ? { journeyPaused: false }
              : {}),
          }
        : state,
    ),
  markDive: () => set((state) => ({ diveCount: state.diveCount + 1 })),
  setSceneAvailable: (sceneAvailable) => set({ sceneAvailable }),
  setJourneyPaused: (journeyPaused) => set({ journeyPaused }),
  failInquiry: (id, error) =>
    set((state) =>
      state.requestId === id
        ? {
            isBusy: false,
            phase: hasReadableAnswer(state.run) ? "reading" : "desk",
            error,
          }
        : state,
    ),
  cancelInquiry: () =>
    set((state) => ({
      requestId: state.requestId + 1,
      isBusy: false,
      phase: "desk",
      error: null,
      divePhase: "idle",
      run: null,
      activeCitationId: null,
      pinnedCitationId: null,
      activeEvidence: null,
    })),
  setQuietReading: (quietReading) => set({ quietReading }),
  setLightMode: (lightMode) => set({ lightMode }),
  resetToDesk: () =>
    set((state) => ({
      requestId: state.requestId + 1,
      phase: "desk",
      activeCitationId: null,
      pinnedCitationId: null,
      activeEvidence: null,
      isBusy: false,
      error: null,
    })),
}));
