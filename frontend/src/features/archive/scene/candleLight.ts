/** Static candle brightness. Flicker is optional; hush and darkness always apply. */
export function candleLightIntensity(input: {
  darkness: number;
  hush: number;
  flicker?: number;
}): number {
  const flicker = input.flicker ?? 1;
  const hushFactor = 1 - input.hush * 0.45;
  const darknessFactor = 1 - input.darkness * 0.7;
  return 2.4 * flicker * hushFactor * darknessFactor;
}
