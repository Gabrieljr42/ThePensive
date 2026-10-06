"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { sceneUniforms } from "../uniforms";
import { useArchiveStore } from "../store";

// Deterministic pseudo-random generator for pure render compliance
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function Dust() {
  const pointsRef = useRef<THREE.Points | null>(null);
  const matRef = useRef<THREE.ShaderMaterial | null>(null);
  const qualityTier = useArchiveStore((s) => s.qualityTier);
  const reducedMotion = useArchiveStore((s) => s.reducedMotion);

  const particleCount = qualityTier === "high" ? 1800 : qualityTier === "mid" ? 900 : 300;

  const [positions, phases] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const ph = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      pos[i * 3 + 0] = (seededRandom(i * 3 + 1) - 0.5) * 5.5; // X
      pos[i * 3 + 1] = 0.2 + seededRandom(i * 3 + 2) * 3.6; // Y
      pos[i * 3 + 2] = -1.0 + seededRandom(i * 3 + 3) * 8.2; // Z
      ph[i] = seededRandom(i * 7 + 4) * Math.PI * 2;
    }

    return [pos, ph];
  }, [particleCount]);

  useEffect(() => {
    matRef.current = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uHush: { value: 0 },
      },
      vertexShader: `
        uniform float uTime;
        attribute float aPhase;
        varying float vAlpha;
        varying vec3 vColor;

        void main() {
          vec3 p = position;

          // Organic slow floating drift
          p.y += sin(uTime * 0.4 + aPhase) * 0.12;
          p.x += cos(uTime * 0.25 + aPhase * 2.0) * 0.08;
          p.z += sin(uTime * 0.2 + aPhase * 1.5) * 0.08;

          // Distance to candle halo (-0.95, 0.95, 2.2)
          vec3 candlePos = vec3(-0.95, 0.95, 2.2);
          float dCandle = length(p - candlePos);
          float candleIllumination = smoothstep(1.4, 0.1, dCandle);

          // Distance to moonbeam axis
          vec3 bStart = vec3(1.0, 4.5, -3.5);
          vec3 bDir = normalize(vec3(-0.2, 0.5, 2.0) - bStart);
          vec3 toP = p - bStart;
          float proj = dot(toP, bDir);
          vec3 closestPoint = bStart + bDir * proj;
          float dBeam = length(p - closestPoint);
          float beamIllumination = (proj > 0.0 && proj < 8.0) ? smoothstep(1.2, 0.1, dBeam) : 0.0;

          float illumination = max(candleIllumination * 0.6, beamIllumination * 0.5);
          float twinkle = sin(uTime * 1.8 + aPhase * 4.0) * 0.5 + 0.5;

          vAlpha = illumination * 0.35 * (0.2 + 0.8 * twinkle);

          if (candleIllumination > beamIllumination) {
            vColor = vec3(1.0, 0.78, 0.45);
          } else {
            vColor = vec3(0.68, 0.82, 0.92);
          }

          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = clamp((0.8 + 1.2 * illumination) * (18.0 / max(0.5, -mvPosition.z)), 1.0, 4.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying vec3 vColor;
        uniform float uHush;

        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);
          if (dist > 0.5) discard;

          float softEdge = smoothstep(0.5, 0.0, dist);
          float finalAlpha = vAlpha * softEdge * (1.0 - uHush * 0.5);

          gl_FragColor = vec4(vColor, finalAlpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    if (pointsRef.current) {
      pointsRef.current.material = matRef.current;
    }
  }, []);

  useFrame((_, delta) => {
    if (matRef.current) {
      if (!reducedMotion) {
        matRef.current.uniforms.uTime.value += delta;
      }
      matRef.current.uniforms.uHush.value = sceneUniforms.environment.hush;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-aPhase"
          args={[phases, 1]}
        />
      </bufferGeometry>
    </points>
  );
}
