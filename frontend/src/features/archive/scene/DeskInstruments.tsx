"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { ArchiveMaterial } from "./ArchiveMaterial";
import { CraftedBox } from "./CraftedBox";

export function DeskInstruments() {
  const ink = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    ctx.strokeStyle = "#58472d";
    ctx.lineWidth = 0.75;
    for (let row = 0; row < 13; row++) {
      const y = 27 + row * 15;
      ctx.beginPath();
      ctx.moveTo(24, y);
      for (let x = 24; x < 215 - (row % 3) * 14; x += 3)
        ctx.lineTo(
          x,
          y + Math.sin(x * 0.55 + row) * 1.4 + Math.sin(x * 0.11) * 0.6,
        );
      ctx.stroke();
    }
    ctx.strokeStyle = "#8b7444";
    ctx.lineWidth = 1;
    ctx.strokeRect(13, 13, 230, 230);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
  useEffect(() => () => ink.dispose(), [ink]);
  return (
    <group>
      <group position={[0.38, 0.84, 0.32]} rotation={[0, -0.28, 0]}>
        <CraftedBox size={[0.85, 0.026, 0.54]}>
          <ArchiveMaterial role="leather" color="#493329" />
        </CraftedBox>
        {[-1, 1].map((side) => (
          <CraftedBox
            key={side}
            position={[side * 0.208, 0.045, 0]}
            size={[0.4, 0.052, 0.5]}
            rotation={[0, 0, side * -0.07]}
          >
            <ArchiveMaterial role="paper" color="#e4d6b8" repeat={[1, 3]} />
          </CraftedBox>
        ))}
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            position={[side * 0.208, 0.074, 0]}
            rotation={[-Math.PI / 2, side * 0.07, 0]}
          >
            <planeGeometry args={[0.375, 0.46]} />
            <meshBasicMaterial
              map={ink}
              transparent
              opacity={0.65}
              depthWrite={false}
            />
          </mesh>
        ))}
        <mesh position={[0, 0.058, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.014, 0.014, 0.51, 8]} />
          <ArchiveMaterial role="paper" />
        </mesh>
      </group>
      <group position={[1.03, 0.99, -0.06]} rotation={[0, 0.2, 0.3]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[i * 0.4, i * 0.95, 0.2]}>
            <torusGeometry args={[0.18 + i * 0.025, 0.006, 6, 40]} />
            <ArchiveMaterial role="brass" />
          </mesh>
        ))}
        <mesh>
          <sphereGeometry args={[0.024, 12, 8]} />
          <ArchiveMaterial role="brass" />
        </mesh>
        <mesh position={[0, -0.13, 0]}>
          <cylinderGeometry args={[0.045, 0.075, 0.18, 12]} />
          <ArchiveMaterial role="brass" />
        </mesh>
      </group>
      <mesh position={[1.28, 0.85, 0.3]}>
        <cylinderGeometry args={[0.055, 0.06, 0.1, 14]} />
        <ArchiveMaterial role="brass" color="#68624d" />
      </mesh>
      <mesh position={[0.85, 0.802, 0.52]} rotation={[0, 0, -1.2]}>
        <cylinderGeometry args={[0.003, 0.006, 0.4, 6]} />
        <ArchiveMaterial role="walnut" color="#c3b190" />
      </mesh>
      <group position={[1.43, 0.85, -0.03]}>
        <mesh position={[0, 0.06, 0]}>
          <sphereGeometry args={[0.075, 16, 12]} />
          <meshStandardMaterial
            color="#9dafae"
            roughness={0.2}
            metalness={0.08}
            transparent
            opacity={0.32}
            depthWrite={false}
          />
        </mesh>
        <mesh position={[0, 0.135, 0]}>
          <cylinderGeometry args={[0.023, 0.026, 0.08, 12]} />
          <meshStandardMaterial
            color="#b8c9c4"
            roughness={0.3}
            transparent
            opacity={0.45}
            depthWrite={false}
          />
        </mesh>
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.025, 0.026, 0.035, 12]} />
          <ArchiveMaterial role="walnut" color="#9c8056" />
        </mesh>
      </group>
    </group>
  );
}
