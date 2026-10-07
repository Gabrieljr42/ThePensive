"use client";

import { CraftedBox } from "./CraftedBox";
import { ArchiveMaterial } from "./ArchiveMaterial";

export function Desk() {
  return (
    <group position={[0, 0.72, 0.35]}>
      <CraftedBox size={[3.35, 0.12, 1.3]} radius={0.045} castShadow>
        <ArchiveMaterial role="walnut" repeat={[2, 2]} />
      </CraftedBox>
      <CraftedBox
        size={[3.42, 0.028, 1.36]}
        position={[0, -0.04, 0]}
        radius={0.015}
      >
        <ArchiveMaterial role="walnut" color="#4f3528" />
      </CraftedBox>
      <CraftedBox size={[2.9, 0.14, 0.045]} position={[0, -0.15, 0.54]}>
        <ArchiveMaterial role="walnut" color="#52372a" />
      </CraftedBox>
      {[-1.38, 1.38].map((x) => (
        <group key={x} position={[x, -0.39, 0]}>
          <CraftedBox size={[0.17, 0.63, 0.86]} radius={0.035} castShadow>
            <ArchiveMaterial role="walnut" color="#503527" repeat={[1, 2]} />
          </CraftedBox>
          <CraftedBox size={[0.28, 0.06, 1]} position={[0, -0.29, 0]}>
            <ArchiveMaterial role="walnut" color="#503527" />
          </CraftedBox>
        </group>
      ))}
      <CraftedBox size={[2.8, 0.085, 0.085]} position={[0, -0.57, -0.2]}>
        <ArchiveMaterial role="walnut" color="#503527" />
      </CraftedBox>
      <CraftedBox
        size={[0.95, 0.012, 0.65]}
        position={[0.38, 0.07, 0.03]}
        rotation={[0, -0.12, 0]}
      >
        <ArchiveMaterial role="paper" color="#d6c9ab" />
      </CraftedBox>
      <mesh position={[0.89, 0.083, 0.22]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.044, 20]} />
        <meshStandardMaterial color="#702a27" roughness={0.46} />
      </mesh>
    </group>
  );
}
