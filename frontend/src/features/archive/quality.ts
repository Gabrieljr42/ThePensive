import { getGPUTier } from "detect-gpu";

export type QualityTier = "high" | "mid" | "low";

export async function detectArchiveQualityTier(): Promise<QualityTier> {
  if (typeof window === "undefined") return "mid";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) return "low";

  const isMobile = window.innerWidth < 768;

  try {
    const gpuTier = await getGPUTier();
    const tier = gpuTier.tier;
    if (tier === undefined || tier === null) return isMobile ? "low" : "mid";
    if (gpuTier.isMobile || isMobile) return tier >= 2 ? "mid" : "low";
    if (tier >= 2) return "high";
    return "mid";
  } catch {
    return isMobile ? "low" : "mid";
  }
}
