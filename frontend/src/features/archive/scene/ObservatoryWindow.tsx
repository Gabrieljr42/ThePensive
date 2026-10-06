"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

export function ObservatoryWindow() {
  const cloudsRef = useRef<THREE.Group | null>(null);

  useFrame((_, delta) => {
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

      {/* The Moon Disc */}
      <mesh position={[1.1, 1.4, -2.2]}>
        <circleGeometry args={[0.95, 32]} />
        <meshBasicMaterial color="#eaf4f8" />
      </mesh>

      {/* Moon Halo */}
      <mesh position={[1.1, 1.4, -2.25]}>
        <circleGeometry args={[2.2, 32]} />
        <meshBasicMaterial
          color="#9cc5d8"
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
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
