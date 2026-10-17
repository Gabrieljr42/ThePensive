"use client";

import { CraftedBox } from "@/features/archive/scene/CraftedBox";
import { ArchiveMaterial } from "@/features/archive/scene/ArchiveMaterial";

const planks: { x: number; color: string }[] = [
  { x: -1.112, color: "#6a4530" },
  { x: 0, color: "#7b5339" },
  { x: 1.112, color: "#5e3e2c" },
];

/** Same footprint and top height as the archive desk. Pose group still owns y. */
export function Desk() {
  return (
    <group position={[0, 0.72, 0.35]}>
      <CraftedBox size={[3.35, 0.08, 1.3]} position={[0, -0.02, 0]} radius={0.012}>
        <ArchiveMaterial role="walnut" color="#4a3124" repeat={[3, 1]} />
      </CraftedBox>
      {planks.map((plank) => (
        <CraftedBox
          key={plank.x}
          size={[1.1, 0.1, 1.28]}
          position={[plank.x, 0.01, 0]}
          radius={0.008}
          castShadow
        >
          <ArchiveMaterial
            role="walnut"
            color={plank.color}
            repeat={[3, 1]}
          />
        </CraftedBox>
      ))}
      <CraftedBox size={[3.46, 0.028, 1.38]} position={[0, -0.05, 0]} radius={0.008}>
        <ArchiveMaterial role="walnut" color="#3f2b22" />
      </CraftedBox>
      <CraftedBox size={[2.55, 0.11, 0.04]} position={[0, -0.16, 0.56]}>
        <ArchiveMaterial role="walnut" color="#52382b" />
      </CraftedBox>
      <group position={[0.05, -0.155, 0.575]}>
        <CraftedBox size={[0.78, 0.09, 0.028]} radius={0.004}>
          <ArchiveMaterial role="walnut" color="#6a4632" />
        </CraftedBox>
        <mesh position={[0, 0, 0.018]}>
          <boxGeometry args={[0.07, 0.012, 0.012]} />
          <ArchiveMaterial role="brass" color="#b89a62" />
        </mesh>
      </group>
      {[-1.38, 1.38].map((x) => (
        <group key={x} position={[x, -0.39, 0]}>
          <CraftedBox size={[0.18, 0.56, 0.84]} radius={0.012} castShadow>
            <ArchiveMaterial role="walnut" color="#4e3428" repeat={[1, 2]} />
          </CraftedBox>
          <mesh position={[0, 0.02, 0.432]}>
            <boxGeometry args={[0.13, 0.4, 0.012]} />
            <ArchiveMaterial role="walnut" color="#3c291f" />
          </mesh>
          {[0.14, -0.1].map((y) => (
            <group key={y} position={[0, y, 0.445]}>
              <mesh>
                <boxGeometry args={[0.145, 0.13, 0.016]} />
                <ArchiveMaterial role="walnut" color="#6d4934" />
              </mesh>
              <mesh position={[0, 0, 0.012]}>
                <torusGeometry args={[0.016, 0.004, 6, 12]} />
                <ArchiveMaterial role="brass" color="#c2a56a" />
              </mesh>
            </group>
          ))}
          {[
            [-0.07, 0.34],
            [0.07, 0.34],
            [-0.07, -0.34],
            [0.07, -0.34],
          ].map(([fx, fz]) => (
            <mesh key={fx + "," + fz} position={[fx, -0.28, fz]}>
              <cylinderGeometry args={[0.028, 0.038, 0.07, 10]} />
              <ArchiveMaterial role="walnut" color="#3a281e" />
            </mesh>
          ))}
        </group>
      ))}
      <CraftedBox size={[2.55, 0.06, 0.07]} position={[0, -0.62, -0.18]}>
        <ArchiveMaterial role="walnut" color="#3f2c22" />
      </CraftedBox>
      <mesh position={[0.42, 0.064, -0.02]} rotation={[-Math.PI / 2, 0, -0.08]}>
        <planeGeometry args={[0.72, 0.46]} />
        <ArchiveMaterial role="leather" color="#3a2c28" repeat={[2, 2]} />
      </mesh>
      <CraftedBox
        size={[0.95, 0.008, 0.65]}
        position={[0.38, 0.066, 0.02]}
        rotation={[0, -0.12, 0]}
      >
        <ArchiveMaterial role="paper" color="#d6c9ab" />
      </CraftedBox>
      <mesh position={[0.89, 0.074, 0.22]} rotation={[-Math.PI / 2, 0, 0.2]}>
        <cylinderGeometry args={[0.044, 0.044, 0.008, 20]} />
        <meshStandardMaterial color="#702a27" roughness={0.46} />
      </mesh>
    </group>
  );
}
