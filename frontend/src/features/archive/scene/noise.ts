/**
 * Deterministic value noise. The same coordinates and octave count always
 * return the same sample. Results stay in [0, 1].
 */

export function hash2(ix: number, iy: number): number {
  let n = Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n = n ^ (n >>> 16);
  return (n >>> 0) / 4294967296;
}

function fade(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Single-octave lattice noise in [0, 1]. */
export function valueNoise2(x: number, y: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = fade(x - x0);
  const ty = fade(y - y0);
  const v00 = hash2(x0, y0);
  const v10 = hash2(x0 + 1, y0);
  const v01 = hash2(x0, y0 + 1);
  const v11 = hash2(x0 + 1, y0 + 1);
  const ax = v00 + (v10 - v00) * tx;
  const bx = v01 + (v11 - v01) * tx;
  return ax + (bx - ax) * ty;
}

/**
 * Fractal value noise in [0, 1]. Each extra octave adds a higher frequency
 * at half the previous amplitude, then the sum is normalized.
 */
export function fbmNoise(x: number, y: number, octaves = 4): number {
  const count = Math.max(1, Math.floor(octaves));
  let amplitude = 1;
  let frequency = 1;
  let sum = 0;
  let weight = 0;
  for (let octave = 0; octave < count; octave += 1) {
    sum += amplitude * valueNoise2(x * frequency, y * frequency);
    weight += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return sum / weight;
}

export function noiseOctavesForTier(tier: "high" | "mid" | "low"): number {
  if (tier === "high") return 5;
  if (tier === "mid") return 3;
  return 1;
}
