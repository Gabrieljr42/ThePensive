"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { useFrame } from "@react-three/fiber";
import type { Volume } from "../model";
import { useArchiveStore } from "../store";
import { anchorRegistry } from "../threads/anchors";
import { ArchiveMaterial } from "./ArchiveMaterial";
import { CraftedBox } from "./CraftedBox";

export function Volume3D({ volume, index }: { volume: Volume; index: number }) {
  const group = useRef<THREE.Group>(null);
  const selected = useArchiveStore((s) =>
    s.selectedVolumeIds.includes(volume.id),
  );
  const hovered = useArchiveStore((s) => s.hoveredVolumeId === volume.id);
  const world = useRef(new THREE.Vector3());
  const x = -1.35 + index * 0.16;
  const h = 0.49 + (index % 3) * 0.028;
  const y = 0.79 + h / 2;
  const bands = useMemo(() => {
    const pieces = [-0.35, -0.16, 0.2, 0.37].map((fraction) => {
      const geometry = new THREE.BoxGeometry(0.134, 0.011, 0.018);
      geometry.translate(0, h * fraction, 0.179);
      return geometry;
    });
    const merged = mergeGeometries(pieces)!;
    pieces.forEach((piece) => piece.dispose());
    return merged;
  }, [h]);
  useEffect(
    () =>
      anchorRegistry.registerWorld("volume-" + volume.id, () => {
        if (group.current) group.current.getWorldPosition(world.current);
        return world.current;
      }),
    [volume.id],
  );
  useFrame((_, delta) => {
    if (!group.current) return;
    const state = useArchiveStore.getState();
    const still =
      state.reducedMotion ||
      state.quietReading ||
      state.lightMode ||
      state.qualityTier === "low";
    const t = still ? 1 : Math.min(delta * 9, 1);
    group.current.position.z = THREE.MathUtils.lerp(
      group.current.position.z,
      selected ? 0.25 : hovered ? 0.16 : 0.1,
      t,
    );
    group.current.rotation.z = THREE.MathUtils.lerp(
      group.current.rotation.z,
      selected ? -0.055 : ((index % 3) - 1) * 0.035,
      t,
    );
  });
  return (
    <group
      ref={group}
      position={[x, y, 0.1]}
      onClick={(event) => {
        event.stopPropagation();
        const s = useArchiveStore.getState();
        if (
          !["dark", "threshold", "approaching"].includes(s.phase) &&
          !s.isBusy
        )
          s.toggleVolume(volume.id);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        useArchiveStore.getState().setHoveredVolume(volume.id);
      }}
      onPointerOut={() => useArchiveStore.getState().setHoveredVolume(null)}
    >
      <CraftedBox size={[0.12, h - 0.036, 0.31]} radius={0.008}>
        <ArchiveMaterial role="paper" color="#d5c5a2" repeat={[1, 3]} />
      </CraftedBox>
      {[-0.07, 0.07].map((side) => (
        <CraftedBox
          key={side}
          size={[0.018, h, 0.36]}
          radius={0.005}
          position={[side, 0, 0]}
          castShadow
        >
          <ArchiveMaterial
            role="leather"
            color={volume.leatherHex}
            emissive={volume.giltHex}
            emissiveIntensity={selected ? 0.075 : hovered ? 0.035 : 0}
          />
        </CraftedBox>
      ))}
      <mesh position={[0, 0, 0.146]} receiveShadow>
        <cylinderGeometry
          args={[0.079, 0.079, h, 12, 1, false, -Math.PI / 2, Math.PI]}
        />
        <ArchiveMaterial role="leather" color={volume.leatherHex} />
      </mesh>
      <mesh geometry={bands}>
        <ArchiveMaterial role="brass" color={volume.giltHex} roughness={0.52} />
      </mesh>
      <mesh position={[0, 0.015, 0.232]} rotation={[0, 0, Math.PI / 4]}>
        <planeGeometry args={[0.028, 0.028]} />
        <meshStandardMaterial
          color={volume.giltHex}
          metalness={0.55}
          roughness={0.48}
          emissive={volume.giltHex}
          emissiveIntensity={selected ? 0.28 : 0}
        />
      </mesh>
    </group>
  );
}

export function VolumesRack() {
  const volumes = useArchiveStore((s) => s.volumes);
  return (
    <group>
      {volumes.map((volume, index) => (
        <Volume3D key={volume.id} volume={volume} index={index} />
      ))}
    </group>
  );
}
