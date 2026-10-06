import { getGPUTier } from "detect-gpu";

export type QualityTier = "high" | "mid" | "low";

export async function detectArchiveQualityTier(): Promise<QualityTier> {
  if (typeof window === "undefined") return "high";

  // Check reduced motion preference
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) return "low";

  // Mobile viewport check
  const isMobile = window.innerWidth < 768;

  try {
    const gpuTier = await getGPUTier();
    if (gpuTier.tier === 0 || gpuTier.isMobile) {
      return isMobile ? "low" : "mid";
    }
    if (gpuTier.tier === 1) return "mid";
    if (gpuTier.tier >= 2) return isMobile ? "mid" : "high";
  } catch {
    // Fallback based on memory and screen
    const navWithMem = navigator as unknown as { deviceMemory?: number };
    const memory = navWithMem.deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    if (isMobile || memory < 4 || cores < 4) return "low";
  }

  return "high";
}
