/**
 * Mutable per-frame scene values animated by GSAP / Director.
 * Read directly in R3F useFrame loops and the canvas ThreadLayer without triggering React re-renders.
 */
export interface SceneUniforms {
  camera: {
    x: number;
    y: number;
    z: number;
    targetX: number;
    targetY: number;
    targetZ: number;
    fov: number;
  };
  environment: {
    darkness: number; // 1 = pitch black, 0 = revealed
    warmth: number; // 0 = moon cold aisle, 1 = warm candlelit desk
    hush: number; // 0 = normal, 1 = deeply dimmed during evidence inspection
    beamIntensity: number;
    candleFlicker: number;
    candleIntensity: number;
  };
  retrieval: {
    active: boolean;
    candidateAwakening: number[]; // 8 items, 0..1
    candidateRerank: number[]; // 8 items, 1 = kept, 0 = faded
    pageBloom: number; // 0..1 (Full Context fanning pages)
    returnThreadsProgress: number; // 0..1
  };
  tomes: {
    revealProgress: number; // 0..1
    ragGlow: number; // 0..1 (amber)
    fullGlow: number; // 0..1 (moonlight)
  };
  thread: {
    castProgress: number; // 0..1
    evidenceProgress: number; // 0..1
  };
}

export const sceneUniforms: SceneUniforms = {
  camera: {
    x: 0,
    y: 1.6,
    z: 6.8, // Long aisle stacks threshold view
    targetX: 0,
    targetY: 0.75,
    targetZ: 0,
    fov: 46,
  },
  environment: {
    darkness: 1, // Starts dark
    warmth: 0.1,
    hush: 0,
    beamIntensity: 0.85,
    candleFlicker: 1,
    candleIntensity: 1.2,
  },
  retrieval: {
    active: false,
    candidateAwakening: [0, 0, 0, 0, 0, 0, 0, 0],
    candidateRerank: [1, 1, 1, 1, 1, 1, 1, 1],
    pageBloom: 0,
    returnThreadsProgress: 0,
  },
  tomes: {
    revealProgress: 0,
    ragGlow: 0,
    fullGlow: 0,
  },
  thread: {
    castProgress: 0,
    evidenceProgress: 0,
  },
};
