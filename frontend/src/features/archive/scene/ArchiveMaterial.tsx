"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { fbmNoise, hash2 } from "./noise";

export type Substance =
  "limestone" | "slate" | "walnut" | "leather" | "paper" | "brass";
const textureCache = new Map<
  string,
  { color: THREE.DataTexture; detail: THREE.DataTexture }
>();

/** Small, deterministic, substance-specific maps shared by every matching mesh. */
function substanceMaps(role: Substance, repeat: [number, number]) {
  const key = role + ":" + repeat.join(",");
  const existing = textureCache.get(key);
  if (existing) return existing;
  const size = 128;
  const color = new Uint8Array(size * size * 4);
  const detail = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const n = fbmNoise(u * 7.8 + 3, v * 7.8 + 11, 2);
      const fine = hash2(x, y);
      let shade = 0.88 + n * 0.1;
      let relief = 0.45 + n * 0.18;
      if (role === "walnut") {
        const grain = Math.sin(
          (v * 37 + n * 0.65 + Math.sin(u * 6.28) * 0.15) * Math.PI * 2,
        );
        shade = 0.72 + n * 0.18 + grain * 0.055 + fine * 0.025;
        relief = 0.5 + grain * 0.1;
      } else if (role === "leather") {
        shade = 0.8 + n * 0.12 + fine * 0.07;
        relief = 0.3 + fine * 0.38 + n * 0.1;
      } else if (role === "limestone") {
        const vein = Math.pow(Math.abs(Math.sin(u * 19 + v * 11 + n * 4)), 24);
        shade = 0.85 + n * 0.11 - vein * 0.09;
        relief = 0.45 + fine * 0.07 + n * 0.18;
      } else if (role === "slate") {
        const joint = u < 0.012 || v < 0.015;
        shade = joint ? 0.42 : 0.8 + n * 0.16;
        relief = joint ? 0.1 : 0.45 + n * 0.2;
      } else if (role === "paper") {
        const edge = Math.sin(v * 128 * Math.PI) * 0.05;
        shade = 0.91 + fine * 0.035 + edge;
        relief = 0.46 + edge;
      } else {
        shade = 0.8 + n * 0.17;
        relief = 0.32 + n * 0.25;
      }
      const i = (y * size + x) * 4;
      color[i] = color[i + 1] = color[i + 2] = Math.round(shade * 255);
      color[i + 3] = 255;
      detail[i] = detail[i + 1] = detail[i + 2] = Math.round(relief * 255);
      detail[i + 3] = 255;
    }
  }
  function make(data: Uint8Array, srgb: boolean) {
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(...repeat);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.needsUpdate = true;
    return texture;
  }
  const maps = { color: make(color, true), detail: make(detail, false) };
  textureCache.set(key, maps);
  return maps;
}

interface ArchiveMaterialProps {
  role: Substance;
  color?: string;
  repeat?: [number, number];
  roughness?: number;
  emissive?: string;
  emissiveIntensity?: number;
}

const finishes: Record<
  Substance,
  { color: string; roughness: number; metalness: number; bump: number }
> = {
  limestone: { color: "#b0a18b", roughness: 0.88, metalness: 0, bump: 0.013 },
  slate: { color: "#464b53", roughness: 0.92, metalness: 0, bump: 0.015 },
  walnut: { color: "#765036", roughness: 0.48, metalness: 0, bump: 0.007 },
  leather: { color: "#443028", roughness: 0.67, metalness: 0, bump: 0.004 },
  paper: { color: "#deceb0", roughness: 0.96, metalness: 0, bump: 0.001 },
  brass: { color: "#b59a62", roughness: 0.38, metalness: 0.78, bump: 0.003 },
};

export function ArchiveMaterial({
  role,
  color,
  repeat = [1, 1],
  roughness,
  emissive = "#000000",
  emissiveIntensity = 0,
}: ArchiveMaterialProps) {
  const rx = repeat[0];
  const ry = repeat[1];
  const maps = useMemo(() => substanceMaps(role, [rx, ry]), [role, rx, ry]);
  const finish = finishes[role];
  return (
    <meshStandardMaterial
      color={color ?? finish.color}
      map={maps.color}
      roughness={roughness ?? finish.roughness}
      metalness={finish.metalness}
      bumpMap={maps.detail}
      bumpScale={finish.bump}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
    />
  );
}
