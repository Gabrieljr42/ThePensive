import { create } from "zustand";
import type { EvidenceResponse, Mode } from "@/lib/contracts";
import type { ArchiveRun, ScenePhase, Volume } from "./model";
import { ARCHIVE_VOLUMES } from "./mock/volumes";
import { MARAUDERS_MAP_QUESTION, MARAUDERS_MAP_RUN } from "./mock/marauders-map";
import {
  createArchiveQualityState,
  noteDetectedTier,
  noteReducedMotion,
  noteSceneMounted,
  type ArchiveQualityState,
  type ArchiveTier,
} from "./archiveBudget";

interface ArchiveState {
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
}

export const useArchiveStore = create<ArchiveState>((set) => ({
  phase: "dark",
  volumes: ARCHIVE_VOLUMES,
  selectedVolumeIds: ["vol-3"], // Volume III (Prisoner of Azkaban) selected by default
  hoveredVolumeId: null,
  mode: "compare",
  question: MARAUDERS_MAP_QUESTION,
  isCustomQuestion: false,
  run: MARAUDERS_MAP_RUN,
  activeCitationId: null,
  pinnedCitationId: null,
  activeEvidence: null,
  reducedMotion: false,
  qualityTier: "mid",
  qualityGate: createArchiveQualityState(),
  isBusy: false,

  setPhase: (phase) => set({ phase }),

  toggleVolume: (id) =>
    set((state) => {
      const exists = state.selectedVolumeIds.includes(id);
      if (exists) {
        // Keep at least one volume selected
        if (state.selectedVolumeIds.length === 1) return state;
        return { selectedVolumeIds: state.selectedVolumeIds.filter((v) => v !== id) };
      }
      return { selectedVolumeIds: [...state.selectedVolumeIds, id] };
    }),

  selectSingleVolume: (id) => set({ selectedVolumeIds: [id] }),

  setHoveredVolume: (id) => set({ hoveredVolumeId: id }),

  setMode: (mode) => set({ mode }),

  setQuestion: (question) =>
    set({
      question,
      isCustomQuestion: question.trim() !== MARAUDERS_MAP_QUESTION,
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

  resetToDesk: () =>
    set({
      phase: "desk",
      activeCitationId: null,
      pinnedCitationId: null,
      activeEvidence: null,
      isBusy: false,
    }),
}));
