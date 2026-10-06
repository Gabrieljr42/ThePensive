"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useArchiveStore } from "../store";
import { NoisyStandardMaterial } from "./NoisyStandardMaterial";
import { moonLocal } from "./sceneLayout";

export function ObservatoryWindow() {
  const cloudsRef = useRef<THREE.Group | null>(null);

  useFrame((_, delta) => {
    const { reducedMotion, qualityTier } = useArchiveStore.getState();
    if (reducedMotion || qualityTier === "low") return;
    if (cloudsRef.current) {
      cloudsRef.current.position.x += delta * 0.015;
      if (cloudsRef.current.position.x > 3.0) {
        cloudsRef.current.position.x = -3.0;
      }
    }
  });

  return (
    <group position={[0, 3.6, -4.0]}>
      {/* Night Sky Dome Backdrop */}
      <mesh position={[0, 0, -2.5]}>
        <planeGeometry args={[10, 10]} />
        <meshBasicMaterial color="#020407" />
      </mesh>

      <mesh position={[moonLocal.x, moonLocal.y, moonLocal.z]} scale={[1, 0.94, 1]}>
        <circleGeometry args={[0.82, 28]} />
        <NoisyStandardMaterial
          color="#c9d3d4"
          roughness={0.96}
          metalness={0}
          repeat={[2.2, 2.2]}
          offset={[0.48, 0.22]}
          strength={0.34}
          emissive="#d5e2e4"
          emissiveIntensity={0.55}
          bump={false}
        />
      </mesh>

      {/* Drifting Clouds / Night Mist */}
      <group ref={cloudsRef} position={[-1.0, 1.3, -2.0]}>
        <mesh position={[-0.8, -0.2, 0]}>
          <planeGeometry args={[3.2, 0.6]} />
          <meshBasicMaterial
            color="#080e18"
            transparent
            opacity={0.7}
            blending={THREE.NormalBlending}
          />
        </mesh>
        <mesh position={[1.2, 0.3, 0]}>
          <planeGeometry args={[2.8, 0.5]} />
          <meshBasicMaterial
            color="#070d16"
            transparent
            opacity={0.65}
            blending={THREE.NormalBlending}
          />
        </mesh>
      </group>

      {/* Gothic Stone Tracery & Mullions */}
      {/* Outer Arch Frame */}
      <mesh position={[0, 0, 0]}>
        <ringGeometry args={[1.9, 2.3, 32, 1, 0, Math.PI]} />
        <meshStandardMaterial color="#080c12" roughness={0.9} />
      </mesh>

      {/* Vertical Mullions */}
      <mesh position={[-0.7, -0.5, 0.05]}>
        <boxGeometry args={[0.07, 3.2, 0.1]} />
        <meshStandardMaterial color="#080c12" roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.5, 0.05]}>
        <boxGeometry args={[0.08, 3.2, 0.1]} />
        <meshStandardMaterial color="#080c12" roughness={0.9} />
      </mesh>
      <mesh position={[0.7, -0.5, 0.05]}>
        <boxGeometry args={[0.07, 3.2, 0.1]} />
        <meshStandardMaterial color="#080c12" roughness={0.9} />
      </mesh>

      {/* Horizontal Transoms */}
      <mesh position={[0, -0.2, 0.05]}>
        <boxGeometry args={[3.8, 0.08, 0.1]} />
        <meshStandardMaterial color="#080c12" roughness={0.9} />
      </mesh>
      <mesh position={[0, -1.2, 0.05]}>
        <boxGeometry args={[3.8, 0.08, 0.1]} />
        <meshStandardMaterial color="#080c12" roughness={0.9} />
      </mesh>
    </group>
  );
}
