"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { ArchiveMaterial } from "@/features/archive/scene/ArchiveMaterial";

let pageEdge: THREE.Texture | null = null;

function pageEdges() {
  if (pageEdge) return pageEdge;
  if (typeof document === "undefined") {
    const data = new Uint8Array([230, 211, 178, 255]);
    const texture = new THREE.DataTexture(data, 1, 1);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    pageEdge = texture;
    return texture;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const data = new Uint8Array([230, 211, 178, 255]);
    const texture = new THREE.DataTexture(data, 1, 1);
    texture.needsUpdate = true;
    pageEdge = texture;
    return texture;
  }
  ctx.fillStyle = "#e7d4b4";
  ctx.fillRect(0, 0, 32, 256);
  ctx.fillStyle = "#b89a74";
  for (let y = 1; y < 256; y += 3) ctx.fillRect(0, y, 32, 1);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  pageEdge = texture;
  return texture;
}

/** Closed codex: page block, boards, round spine, gilt bands. Spine faces +Z. */
export function BoundVolume({
  height,
  thickness = 0.158,
  depth = 0.36,
  leather,
  gilt,
  emissiveIntensity = 0,
  open = 0,
  castShadow = false,
}: {
  height: number;
  thickness?: number;
  depth?: number;
  leather: string;
  gilt: string;
  emissiveIntensity?: number;
  open?: number;
  castShadow?: boolean;
}) {
  const boardT = Math.min(0.02, thickness * 0.13);
  const pageT = Math.max(0.05, thickness - boardT * 2.4);
  const pageH = height - 0.03;
  const pageD = depth - 0.055;
  const radius = thickness * 0.5;
  const spineZ = depth / 2 - radius * 0.4;
  const edges = useMemo(() => pageEdges(), []);
  const boardGeo = useMemo(
    () =>
      new RoundedBoxGeometry(
        boardT,
        height,
        depth,
        2,
        Math.min(0.004, boardT / 3),
      ),
    [boardT, height, depth],
  );
  useEffect(() => () => boardGeo.dispose(), [boardGeo]);
  const leatherProps = {
    role: "leather" as const,
    color: leather,
    emissive: gilt,
    emissiveIntensity,
  };
  return (
    <group>
      <mesh position={[0, 0, -0.012]} receiveShadow>
        <boxGeometry args={[pageT, pageH, pageD]} />
        <ArchiveMaterial role="paper" color="#e4d3b4" repeat={[1, 4]} />
      </mesh>
      <mesh
        position={[0, 0, -0.012 - pageD / 2]}
        rotation={[0, Math.PI, 0]}
      >
        <planeGeometry args={[pageT * 0.96, pageH * 0.98]} />
        <meshStandardMaterial map={edges} roughness={0.95} />
      </mesh>
      <mesh
        position={[0, pageH / 2, -0.012]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[pageT * 0.96, pageD * 0.96]} />
        <meshStandardMaterial map={edges} roughness={0.95} />
      </mesh>
      {([-1, 1] as const).map((side) => (
        <group
          key={side}
          position={[0, 0, spineZ]}
          rotation={[0, side * open * 0.72, 0]}
        >
          <group position={[side * (thickness / 2 - boardT / 2), 0, -spineZ]}>
            <mesh geometry={boardGeo} castShadow={castShadow} receiveShadow>
              <ArchiveMaterial {...leatherProps} />
            </mesh>
            <mesh position={[side * (boardT / 2 + 0.002), 0, -0.01]}>
              <boxGeometry args={[0.004, height * 0.58, depth * 0.55]} />
              <ArchiveMaterial role="leather" color={leather} />
            </mesh>
          </group>
        </group>
      ))}
      <mesh position={[0, 0, spineZ]} castShadow={castShadow} receiveShadow>
        <cylinderGeometry
          args={[radius, radius, height, 16, 1, false, -Math.PI / 2, Math.PI]}
        />
        <ArchiveMaterial {...leatherProps} />
      </mesh>
      {[-0.34, -0.1, 0.16, 0.36].map((fraction) => (
        <mesh
          key={fraction}
          position={[0, height * fraction, spineZ + radius * 0.72]}
        >
          <boxGeometry args={[thickness * 0.9, 0.011, 0.016]} />
          <ArchiveMaterial role="brass" color={gilt} roughness={0.46} />
        </mesh>
      ))}
      {[-1, 1].map((end) => (
        <mesh key={end} position={[0, end * (height / 2 - 0.01), spineZ - 0.01]}>
          <boxGeometry args={[pageT * 0.92, 0.012, 0.02]} />
          <meshStandardMaterial color={gilt} roughness={0.62} />
        </mesh>
      ))}
      <mesh position={[0, 0.02, -depth / 2 - 0.001]} rotation={[0, 0, Math.PI / 4]}>
        <planeGeometry args={[0.026, 0.026]} />
        <meshStandardMaterial
          color={gilt}
          metalness={0.55}
          roughness={0.42}
          emissive={gilt}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>
    </group>
  );
}
