"use client";

import * as THREE from "three";

export function Desk() {
  return (
    <group position={[0, 0.48, 0.2]}>
      {/* Main Polished Wood Tabletop */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.8, 0.08, 1.8]} />
        <meshStandardMaterial
          color="#150f0b"
          roughness={0.42}
          metalness={0.15}
        />
      </mesh>

      {/* Brass Beveled Inlay Border */}
      <mesh position={[0, 0.041, 0]} receiveShadow>
        <planeGeometry args={[3.65, 1.65]} />
        <meshStandardMaterial
          color="#110c09"
          roughness={0.38}
          metalness={0.2}
        />
      </mesh>

      {/* Fine Gold Inlay Filigree Wire Outline */}
      <lineSegments position={[0, 0.043, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(3.64, 1.64)]} />
        <lineBasicMaterial color="#bda04a" />
      </lineSegments>

      {/* Turned Table Legs */}
      <mesh position={[-1.7, -0.24, -0.7]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 0.44, 12]} />
        <meshStandardMaterial color="#100b08" roughness={0.7} />
      </mesh>
      <mesh position={[1.7, -0.24, -0.7]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 0.44, 12]} />
        <meshStandardMaterial color="#100b08" roughness={0.7} />
      </mesh>
      <mesh position={[-1.7, -0.24, 0.7]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 0.44, 12]} />
        <meshStandardMaterial color="#100b08" roughness={0.7} />
      </mesh>
      <mesh position={[1.7, -0.24, 0.7]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 0.44, 12]} />
        <meshStandardMaterial color="#100b08" roughness={0.7} />
      </mesh>

      {/* Oak Book Rack Base on Left Side */}
      <mesh position={[-1.15, 0.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.15, 0.035, 0.45]} />
        <meshStandardMaterial color="#1f1610" roughness={0.6} />
      </mesh>
      {/* Rack End Bookends */}
      <mesh position={[-1.71, 0.16, 0]} castShadow>
        <boxGeometry args={[0.03, 0.22, 0.44]} />
        <meshStandardMaterial color="#2d2017" roughness={0.6} />
      </mesh>
      <mesh position={[-0.59, 0.16, 0]} castShadow>
        <boxGeometry args={[0.03, 0.22, 0.44]} />
        <meshStandardMaterial color="#2d2017" roughness={0.6} />
      </mesh>
    </group>
  );
}
