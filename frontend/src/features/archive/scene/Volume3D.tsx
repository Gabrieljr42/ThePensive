"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { Volume } from "../model";
import { useArchiveStore } from "../store";
import { anchorRegistry } from "../threads/anchors";

interface Volume3DProps {
  volume: Volume;
  index: number;
}

export function Volume3D({ volume, index }: Volume3DProps) {
  const groupRef = useRef<THREE.Group | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);

  const selectedVolumeIds = useArchiveStore((s) => s.selectedVolumeIds);
  const hoveredVolumeId = useArchiveStore((s) => s.hoveredVolumeId);
  const toggleVolume = useArchiveStore((s) => s.toggleVolume);
  const setHoveredVolume = useArchiveStore((s) => s.setHoveredVolume);
  const phase = useArchiveStore((s) => s.phase);

  const isSelected = selectedVolumeIds.includes(volume.id);
  const isHovered = hoveredVolumeId === volume.id;

  // Base slot position in the desk book rack
  // 7 books spaced between x = -1.58 and -0.72
  const rackX = -1.58 + index * 0.138;
  const rackY = 0.65;
  const rackZ = 0.2;

  const targetPos = useRef(new THREE.Vector3(rackX, rackY, rackZ));
  const targetRot = useRef(new THREE.Euler(0, 0, 0));
  const worldPos = useRef(new THREE.Vector3());

  // Register anchor for threads
  useEffect(() => {
    return anchorRegistry.registerWorld(`volume-${volume.id}`, () => {
      if (groupRef.current) {
        groupRef.current.getWorldPosition(worldPos.current);
        return worldPos.current;
      }
      return new THREE.Vector3(rackX, rackY, rackZ);
    });
  }, [volume.id, rackX, rackY, rackZ]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Calculate targets based on interaction state
    if (isSelected) {
      // Selected book slides forward onto the reading desk workspace
      targetPos.current.set(rackX, rackY + 0.04, rackZ + 0.22);
      targetRot.current.set(0.12, 0.04, -0.04);
    } else if (isHovered) {
      // Hovered: slides forward 6px and catches the light
      targetPos.current.set(rackX, rackY + 0.015, rackZ + 0.07);
      targetRot.current.set(0.04, 0.02, 0);
    } else {
      // Resting in rack
      targetPos.current.set(rackX, rackY, rackZ);
      targetRot.current.set(0, 0, 0);
    }

    // Smooth lerp
    const t = Math.min(delta * 10, 1);
    groupRef.current.position.lerp(targetPos.current, t);
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      targetRot.current.x,
      t,
    );
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetRot.current.y,
      t,
    );
    groupRef.current.rotation.z = THREE.MathUtils.lerp(
      groupRef.current.rotation.z,
      targetRot.current.z,
      t,
    );
  });

  const bookWidth = 0.11;
  const bookHeight = 0.32;
  const bookDepth = 0.24;

  return (
    <group
      ref={groupRef}
      position={[rackX, rackY, rackZ]}
      onClick={(e) => {
        e.stopPropagation();
        if (phase === "threshold") return;
        toggleVolume(volume.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (phase === "threshold") return;
        setHoveredVolume(volume.id);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHoveredVolume(null);
        document.body.style.cursor = "default";
      }}
    >
      {/* Leather Book Body */}
      <mesh ref={meshRef} castShadow receiveShadow>
        <boxGeometry args={[bookWidth, bookHeight, bookDepth]} />
        <meshStandardMaterial
          color={volume.leatherHex}
          roughness={0.52}
          metalness={0.25}
          emissive={isSelected ? volume.giltHex : "#000000"}
          emissiveIntensity={isSelected ? 0.28 : isHovered ? 0.14 : 0}
        />
      </mesh>

      {/* Gilt Spine Ribs (Raised gold bands) */}
      <mesh position={[0, bookHeight * 0.28, bookDepth * 0.505]}>
        <boxGeometry args={[bookWidth * 0.92, 0.008, 0.006]} />
        <meshStandardMaterial
          color={volume.giltHex}
          metalness={0.85}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0, -bookHeight * 0.28, bookDepth * 0.505]}>
        <boxGeometry args={[bookWidth * 0.92, 0.008, 0.006]} />
        <meshStandardMaterial
          color={volume.giltHex}
          metalness={0.85}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0, 0, bookDepth * 0.505]}>
        <boxGeometry args={[bookWidth * 0.92, 0.008, 0.006]} />
        <meshStandardMaterial
          color={volume.giltHex}
          metalness={0.85}
          roughness={0.3}
        />
      </mesh>

      {/* Pages Block on side & top */}
      <mesh position={[0, 0, -0.01]}>
        <boxGeometry args={[bookWidth * 0.88, bookHeight * 0.94, bookDepth * 0.92]} />
        <meshStandardMaterial
          color="#ebdcb9"
          roughness={0.8}
          metalness={0.05}
        />
      </mesh>
    </group>
  );
}

export function VolumesRack() {
  const volumes = useArchiveStore((s) => s.volumes);

  return (
    <group>
      {volumes.map((vol, idx) => (
        <Volume3D key={vol.id} volume={vol} index={idx} />
      ))}
    </group>
  );
}
