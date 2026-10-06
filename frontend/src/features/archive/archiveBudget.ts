export type ArchiveTier = "high" | "mid" | "low";

export const CONSERVATIVE_ARCHIVE_TIER: ArchiveTier = "mid";

/** First frame and every later frame stay inside this device-pixel cap. */
export const ARCHIVE_PIXEL_RATIO_CAP = 1.25;

export interface ArchiveQualityState {
  tier: ArchiveTier;
  pendingHigh: boolean;
  mounted: boolean;
  reducedMotion: boolean;
}

export function createArchiveQualityState(): ArchiveQualityState {
  return {
    tier: CONSERVATIVE_ARCHIVE_TIER,
    pendingHigh: false,
    mounted: false,
    reducedMotion: false,
  };
}

export function noteReducedMotion(
  state: ArchiveQualityState,
  reducedMotion: boolean,
): ArchiveQualityState {
  if (!reducedMotion) return { ...state, reducedMotion: false };
  return { ...state, reducedMotion: true, tier: "low", pendingHigh: false };
}

/**
 * A detected high tier waits until the first conservative frame has mounted.
 * Reduced motion and an explicit low/mid result never promote into high.
 */
export function noteDetectedTier(
  state: ArchiveQualityState,
  detected: ArchiveTier,
): ArchiveQualityState {
  if (state.reducedMotion) {
    return { ...state, tier: "low", pendingHigh: false };
  }
  if (detected !== "high") {
    return { ...state, tier: detected, pendingHigh: false };
  }
  if (!state.mounted) {
    return { ...state, pendingHigh: true };
  }
  return { ...state, tier: "high", pendingHigh: false };
}

export function noteSceneMounted(state: ArchiveQualityState): ArchiveQualityState {
  if (state.reducedMotion) {
    return { ...state, mounted: true, tier: "low", pendingHigh: false };
  }
  if (state.pendingHigh) {
    return { ...state, mounted: true, tier: "high", pendingHigh: false };
  }
  return { ...state, mounted: true };
}

export function dustBudget(tier: ArchiveTier): number {
  if (tier === "high") return 480;
  if (tier === "mid") return 160;
  return 0;
}

export function archiveFrameLoop(input: {
  hidden: boolean;
  reducedMotion: boolean;
  tier: ArchiveTier;
}): "always" | "demand" | "never" {
  if (input.hidden) return "never";
  if (input.reducedMotion || input.tier === "low") return "demand";
  return "always";
}

export function pixelRatioCap(): number {
  return ARCHIVE_PIXEL_RATIO_CAP;
}
