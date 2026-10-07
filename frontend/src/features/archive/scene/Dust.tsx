"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { sceneUniforms } from "../uniforms";
import { useArchiveStore } from "../store";
import { dustBudget } from "../archiveBudget";
import { noiseOctavesForTier } from "./noise";
import { sharedNoiseTexture } from "./noiseTexture";

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const dustVertex = `
  uniform float uTime;
  attribute float aPhase;
  varying float vAlpha;
  varying vec3 vColor;
  varying vec2 vSeed;

  void main() {
    vec3 p = position;
    p.y += sin(uTime * 0.4 + aPhase) * 0.12;
    p.x += cos(uTime * 0.25 + aPhase * 2.0) * 0.08;
    p.z += sin(uTime * 0.2 + aPhase * 1.5) * 0.08;

    vec3 candlePos = vec3(-0.95, 0.95, 2.2);
    float dCandle = length(p - candlePos);
    float candleIllumination = smoothstep(1.4, 0.1, dCandle);

    vec3 bStart = vec3(1.0, 4.5, -3.5);
    vec3 bDir = normalize(vec3(-0.2, 0.5, 2.0) - bStart);
    vec3 toP = p - bStart;
    float proj = dot(toP, bDir);
    vec3 closestPoint = bStart + bDir * proj;
    float dBeam = length(p - closestPoint);
    float beamIllumination = (proj > 0.0 && proj < 8.0) ? smoothstep(1.2, 0.1, dBeam) : 0.0;

    float illumination = max(candleIllumination * 0.6, beamIllumination * 0.5);
    float twinkle = sin(uTime * 1.8 + aPhase * 4.0) * 0.5 + 0.5;
    vAlpha = illumination * 0.4 * (0.25 + 0.75 * twinkle);
    vColor = candleIllumination > beamIllumination ? vec3(1.0, 0.78, 0.45) : vec3(0.68, 0.82, 0.92);
    vSeed = vec2(aPhase * 0.17, aPhase * 0.11);

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = clamp((0.8 + 1.2 * illumination) * (16.0 / max(0.5, -mvPosition.z)), 1.0, 3.5);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const dustFragment = `
  varying float vAlpha;
  varying vec3 vColor;
  varying vec2 vSeed;
  uniform float uHush;
  uniform sampler2D uNoise;

  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;
    float n = texture2D(uNoise, gl_PointCoord * 0.45 + vSeed).r;
    float softEdge = smoothstep(0.5, 0.02, dist) * (0.4 + 0.6 * n);
    gl_FragColor = vec4(vColor, vAlpha * softEdge * (1.0 - uHush * 0.5));
  }
`;

export function Dust() {
  const tier = useArchiveStore((s) => s.qualityTier);
  const quiet = useArchiveStore(
    (s) => s.quietReading || s.reducedMotion || s.lightMode,
  );
  const particleCount = quiet ? 0 : dustBudget(tier);
  const octaves = noiseOctavesForTier(tier);
  const noiseMap = useMemo(() => sharedNoiseTexture(octaves), [octaves]);

  const [positions, phases] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const ph = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i += 1) {
      pos[i * 3] = (seededRandom(i * 3 + 1) - 0.5) * 5.5;
      pos[i * 3 + 1] = 0.2 + seededRandom(i * 3 + 2) * 3.6;
      pos[i * 3 + 2] = -1 + seededRandom(i * 3 + 3) * 8.2;
      ph[i] = seededRandom(i * 7 + 4) * Math.PI * 2;
    }
    return [pos, ph];
  }, [particleCount]);

  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  useLayoutEffect(() => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uHush: { value: 0 },
        uNoise: { value: noiseMap },
      },
      vertexShader: dustVertex,
      fragmentShader: dustFragment,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    materialRef.current = material;
    if (pointsRef.current) pointsRef.current.material = material;
    return () => {
      material.dispose();
      if (materialRef.current === material) materialRef.current = null;
    };
  }, [noiseMap]);

  useFrame((_, delta) => {
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.uHush.value = sceneUniforms.environment.hush;
    const state = useArchiveStore.getState();
    if (state.reducedMotion || state.qualityTier === "low") return;
    material.uniforms.uTime.value += delta;
  });

  if (particleCount === 0) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aPhase" args={[phases, 1]} />
      </bufferGeometry>
    </points>
  );
}
