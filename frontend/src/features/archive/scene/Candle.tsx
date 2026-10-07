"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { sceneUniforms } from "../uniforms";
import { useArchiveStore } from "../store";
import { noiseOctavesForTier } from "./noise";
import { sharedNoiseTexture } from "./noiseTexture";
import { candleLightIntensity } from "./candleLight";
import { ArchiveMaterial } from "./ArchiveMaterial";

const flameVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const flameFragment = `
  uniform float uTime;
  uniform sampler2D uNoise;
  varying vec2 vUv;

  void main() {
    float n = texture2D(uNoise, vec2(vUv.x * 1.4 + 0.2, vUv.y * 2.1 + uTime * 0.35)).r;
    vec2 p = vUv - vec2(0.5, 0.18);
    p.x += (n - 0.5) * 0.2 * max(p.y, 0.0);

    float dist = length(vec2(p.x * 2.05, p.y));
    if (dist > 0.5) discard;

    vec3 innerBlue = vec3(0.16, 0.36, 0.95);
    vec3 amberCore = vec3(1.0, 0.52, 0.1);
    vec3 hotWhite = vec3(1.0, 0.95, 0.78);
    vec3 color = mix(amberCore, hotWhite, smoothstep(0.34, 0.0, dist));
    color *= 0.82 + n * 0.36;
    if (p.y < 0.06) color = mix(innerBlue, color, clamp(p.y / 0.06, 0.0, 1.0));

    float alpha = smoothstep(0.5, 0.08, dist);
    gl_FragColor = vec4(color, alpha);
  }
`;

export function Candle() {
  const lightRef = useRef<THREE.PointLight>(null);
  const tier = useArchiveStore((s) => s.qualityTier);
  const octaves = noiseOctavesForTier(tier);
  const noiseMap = useMemo(() => sharedNoiseTexture(octaves), [octaves]);
  const flameRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  useLayoutEffect(() => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uNoise: { value: noiseMap },
      },
      vertexShader: flameVertex,
      fragmentShader: flameFragment,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    materialRef.current = material;
    if (flameRef.current) flameRef.current.material = material;
    return () => {
      material.dispose();
      if (materialRef.current === material) materialRef.current = null;
    };
  }, [noiseMap]);

  useFrame((_, delta) => {
    const state = useArchiveStore.getState();
    const still =
      state.reducedMotion ||
      state.qualityTier === "low" ||
      state.quietReading ||
      state.lightMode;
    const material = materialRef.current;
    if (material && !still) {
      material.uniforms.uTime.value += delta;
    }
    const time = material?.uniforms.uTime.value ?? 0;
    const flicker = still
      ? 1
      : 1 + Math.sin(time * 7.1) * 0.08 + Math.sin(time * 13.7) * 0.05;
    sceneUniforms.environment.candleFlicker = flicker;
    if (lightRef.current) {
      lightRef.current.intensity = candleLightIntensity({
        darkness: sceneUniforms.environment.darkness,
        hush: sceneUniforms.environment.hush,
        flicker,
      });
    }
  });

  return (
    <group position={[-1.47, 0.85, 0.65]}>
      <mesh position={[0, -0.06, 0]} castShadow={false} receiveShadow>
        <cylinderGeometry args={[0.15, 0.18, 0.03, 20]} />
        <ArchiveMaterial role="brass" />
      </mesh>
      <mesh position={[0, 0.13, 0]} castShadow={false} receiveShadow>
        <cylinderGeometry args={[0.042, 0.05, 0.36, 20]} />
        <meshStandardMaterial color="#e2cba4" roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.325, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.025, 6]} />
        <meshBasicMaterial color="#1a1410" />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          position={[
            Math.sin(i * 1.6) * 0.043,
            0.22 - i * 0.018,
            Math.cos(i * 1.6) * 0.043,
          ]}
        >
          <capsuleGeometry args={[0.006, 0.05 + i * 0.009, 3, 6]} />
          <meshStandardMaterial color="#d9c3a0" roughness={0.8} />
        </mesh>
      ))}
      <mesh ref={flameRef} position={[0, 0.4, 0]}>
        <planeGeometry args={[0.11, 0.18]} />
      </mesh>
      <pointLight
        ref={lightRef}
        position={[0, 0.46, 0]}
        color="#ffb04a"
        intensity={candleLightIntensity({ darkness: 1, hush: 0, flicker: 1 })}
        distance={7.5}
        decay={2}
      />
    </group>
  );
}
