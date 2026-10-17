"use client";

import { useMemo } from "react";
import type { WebGLProgramParametersWithUniforms } from "three";
import { useArchiveStore } from "../store";
import { noiseOctavesForTier } from "./noise";
import { sharedNoiseMap } from "./noiseTexture";

interface NoisyStandardMaterialProps {
  color: string;
  roughness?: number;
  metalness?: number;
  repeat: [number, number];
  offset?: [number, number];
  strength?: number;
  emissive?: string;
  emissiveIntensity?: number;
  bump?: boolean;
}

function compileArchiveNoise(
  shader: WebGLProgramParametersWithUniforms,
  strength: number,
) {
  shader.uniforms.uNoiseStrength = { value: strength };
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <common>",
    `#include <common>
     uniform float uNoiseStrength;`,
  );
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <roughnessmap_fragment>",
    `#include <roughnessmap_fragment>
     {
       float stone = texture2D(roughnessMap, vRoughnessMapUv).r;
       float grain = texture2D(roughnessMap, vRoughnessMapUv).g;
       float detail = mix(stone, grain, 0.45);
       diffuseColor.rgb *= mix(1.0 - uNoiseStrength, 1.0 + uNoiseStrength, detail);
     }`,
  );
}

export function NoisyStandardMaterial({
  color,
  roughness = 0.82,
  metalness = 0.04,
  repeat,
  offset = [0, 0],
  strength = 0.38,
  emissive = "#000000",
  emissiveIntensity = 0,
  bump = true,
}: NoisyStandardMaterialProps) {
  const tier = useArchiveStore((s) => s.qualityTier);
  const octaves = noiseOctavesForTier(tier);
  const useBump = bump && tier !== "low";
  const repeatX = repeat[0];
  const repeatY = repeat[1];
  const offsetX = offset[0];
  const offsetY = offset[1];
  const map = useMemo(() => {
    const tex = sharedNoiseMap(octaves, repeatX, repeatY);
    tex.offset.set(offsetX, offsetY);
    return tex;
  }, [octaves, repeatX, repeatY, offsetX, offsetY]);

  const onBeforeCompile = useMemo(
    () => (shader: WebGLProgramParametersWithUniforms) => {
      compileArchiveNoise(shader, strength);
    },
    [strength],
  );

  return (
    <meshStandardMaterial
      key={`${octaves}-${useBump ? "bump" : "flat"}-${strength}`}
      color={color}
      roughness={roughness}
      metalness={metalness}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
      roughnessMap={map}
      bumpMap={useBump ? map : undefined}
      bumpScale={useBump ? 0.045 * strength : 0}
      onBeforeCompile={onBeforeCompile}
    />
  );
}
