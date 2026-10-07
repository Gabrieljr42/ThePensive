"use client";
import { useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { ArchiveMaterial } from "./ArchiveMaterial";
import { CraftedBox } from "./CraftedBox";

/** Distant architecture is a backplate. Foreground arches remain real geometry. */
export function ObservatoryWindow() {
  const original = useTexture("/art/archive-architecture.webp");
  const texture = useMemo(() => {
    const copy = original.clone();
    // Crop to the walls; the foreground floor is an actual receiving plane.
    copy.colorSpace = THREE.SRGBColorSpace;
    copy.repeat.set(1, 0.72);
    copy.offset.set(0, 0.28);
    return copy;
  }, [original]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group>
      <mesh position={[0, 3.9, -5.1]}>
        <planeGeometry args={[13.8, 7.7]} />
        <meshBasicMaterial map={texture} color="#aeb9c4" toneMapped={false} />
      </mesh>
      {[1.7, 4.5].map((z) => (
        <group key={z}>
          <mesh position={[0, 4.25, z]}>
            <torusGeometry args={[2.83, 0.12, 8, 40, Math.PI]} />
            <ArchiveMaterial role="limestone" color="#686057" repeat={[3, 1]} />
          </mesh>
          {[-2.83, 2.83].map((x) => (
            <group key={x}>
              <CraftedBox
                size={[0.22, 4.22, 0.27]}
                position={[x, 2.14, z]}
                radius={0.025}
              >
                <ArchiveMaterial
                  role="limestone"
                  color="#847565"
                  repeat={[1, 3]}
                />
              </CraftedBox>
              <CraftedBox
                size={[0.38, 0.14, 0.4]}
                position={[x, 4.19, z]}
                radius={0.02}
              >
                <ArchiveMaterial role="limestone" color="#998570" />
              </CraftedBox>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}
