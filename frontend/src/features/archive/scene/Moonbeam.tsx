"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { sceneUniforms } from "../uniforms";
import { useArchiveStore } from "../store";
import { noiseOctavesForTier } from "./noise";
import { sharedNoiseTexture } from "./noiseTexture";

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uTaps;
  uniform vec3 uColor;
  uniform sampler2D uNoise;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    float centerDist = abs(vUv.x - 0.5) * 2.0;
    float sideFade = smoothstep(1.0, 0.12, centerDist);
    float lengthFade = smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.42, vUv.y);

    vec2 uv1 = vWorldPos.xz * 0.17 + vec2(uTime * 0.02, vWorldPos.y * 0.07);
    float n = texture2D(uNoise, uv1).r;
    if (uTaps > 1.5) {
      vec2 uv2 = vWorldPos.xy * 0.33 + vec2(-uTime * 0.015, uTime * 0.012);
      n = n * 0.62 + texture2D(uNoise, uv2).g * 0.38;
    }

    float alpha = sideFade * lengthFade * (0.42 + (n - 0.5) * 0.85) * uIntensity * 0.55;
    gl_FragColor = vec4(uColor, clamp(alpha, 0.0, 0.8));
  }
`;

export function Moonbeam() {
  const tier = useArchiveStore((s) => s.qualityTier);
  const octaves = noiseOctavesForTier(tier);
  const noiseMap = useMemo(() => sharedNoiseTexture(octaves), [octaves]);
  const taps = tier === "low" ? 1 : 2;
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  useLayoutEffect(() => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0.85 },
        uTaps: { value: taps },
        uColor: { value: new THREE.Color("#9ec8dc") },
        uNoise: { value: noiseMap },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    materialRef.current = material;
    if (meshRef.current) meshRef.current.material = material;
    return () => {
      material.dispose();
      if (materialRef.current === material) materialRef.current = null;
    };
  }, [noiseMap, taps]);

  useFrame((_, delta) => {
    const material = materialRef.current;
    if (!material) return;
    const hushMult = 1 - sceneUniforms.environment.hush * 0.6;
    material.uniforms.uIntensity.value = sceneUniforms.environment.beamIntensity * hushMult;
    const state = useArchiveStore.getState();
    if (state.reducedMotion || state.qualityTier === "low") return;
    material.uniforms.uTime.value += delta;
  });

  return (
    <mesh ref={meshRef} position={[0.4, 2.5, 0.8]} rotation={[0.38, -0.22, -0.25]}>
      <cylinderGeometry args={[0.5, 2.2, 7.5, 16, 1, true]} />
    </mesh>
  );
}
