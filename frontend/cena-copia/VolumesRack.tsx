"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { Volume } from "@/features/archive/model";
import { useArchiveStore } from "@/features/archive/store";
import { anchorRegistry } from "@/features/archive/threads/anchors";
import { BoundVolume } from "./BoundVolume";

function DeskVolume({ volume, index }: { volume: Volume; index: number }) {
  const group = useRef<THREE.Group>(null);
  const selected = useArchiveStore((s) =>
    s.selectedVolumeIds.includes(volume.id),
  );
  const hovered = useArchiveStore((s) => s.hoveredVolumeId === volume.id);
  const world = useRef(new THREE.Vector3());
  const x = -1.35 + index * 0.16;
  const h = 0.49 + (index % 3) * 0.028;
  const y = 0.79 + h / 2;
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
      <BoundVolume
        height={h}
        leather={volume.leatherHex}
        gilt={volume.giltHex}
        emissiveIntensity={selected ? 0.075 : hovered ? 0.035 : 0}
        castShadow
      />
    </group>
  );
}

export function VolumesRack() {
  const volumes = useArchiveStore((s) => s.volumes);
  return (
    <group>
      {volumes.map((volume, index) => (
        <DeskVolume key={volume.id} volume={volume} index={index} />
      ))}
    </group>
  );
}
