"use client";

import { NoisyStandardMaterial } from "./NoisyStandardMaterial";
import { useArchiveStore } from "../store";
import { deskSupports, materialRoles } from "./sceneLayout";

export function Desk() {
  const shadows = useArchiveStore((s) => s.qualityTier) === "high";
  const wood = materialRoles.wood;

  return (
    <group position={[0, 0.48, 0.2]}>
      <mesh position={[0.04, 0, 0.02]} castShadow={shadows} receiveShadow>
        <boxGeometry args={[3.55, 0.07, 1.62]} />
        <NoisyStandardMaterial
          color={wood.color}
          roughness={wood.roughness}
          metalness={wood.metalness}
          repeat={wood.repeat}
          offset={wood.offset}
          strength={wood.strength}
        />
      </mesh>
      <mesh position={[-1.55, 0.01, 0.18]} rotation={[0, 0.04, 0]} castShadow={shadows} receiveShadow>
        <boxGeometry args={[0.72, 0.05, 0.48]} />
        <NoisyStandardMaterial
          color="#5c3d28"
          roughness={0.8}
          metalness={0.02}
          repeat={[6, 1.2]}
          offset={[0.62, 0.2]}
          strength={0.42}
          bump={false}
        />
      </mesh>

      {deskSupports.map((support) => (
        <mesh
          key={`${support.x}-${support.z}`}
          position={[support.x, -0.24, support.z]}
          rotation={[0, support.rotY, 0]}
          castShadow={shadows}
        >
          <boxGeometry args={[support.width, support.height, 1.15]} />
          <NoisyStandardMaterial
            color="#4e3424"
            roughness={0.82}
            metalness={0.02}
            repeat={[1.2, 4]}
            offset={[0.33, 0.4]}
            strength={0.3}
            bump={false}
          />
        </mesh>
      ))}

      <mesh position={[-1.15, 0.05, 0]} castShadow={shadows} receiveShadow>
        <boxGeometry args={[1.15, 0.035, 0.45]} />
        <NoisyStandardMaterial
          color={wood.color}
          roughness={0.76}
          metalness={0.03}
          repeat={[4, 1.2]}
          offset={wood.offset}
          strength={0.34}
          bump={false}
        />
      </mesh>
      <mesh position={[-1.71, 0.16, 0]} castShadow={shadows}>
        <boxGeometry args={[0.03, 0.22, 0.44]} />
        <NoisyStandardMaterial
          color="#4a3428"
          roughness={0.7}
          metalness={0.04}
          repeat={[1, 2]}
          offset={[0.5, 0.2]}
          strength={0.24}
          bump={false}
        />
      </mesh>
      <mesh position={[-0.59, 0.16, 0.02]} rotation={[0, 0.08, 0]} castShadow={shadows}>
        <boxGeometry args={[0.035, 0.2, 0.4]} />
        <NoisyStandardMaterial
          color="#4a3428"
          roughness={0.7}
          metalness={0.04}
          repeat={[1, 2]}
          offset={[0.15, 0.5]}
          strength={0.24}
          bump={false}
        />
      </mesh>
    </group>
  );
}
