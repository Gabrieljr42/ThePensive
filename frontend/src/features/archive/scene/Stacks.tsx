"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { NoisyStandardMaterial } from "./NoisyStandardMaterial";
import { useArchiveStore } from "../store";
import { booksForSide, materialRoles, shelfCases, shelfSides } from "./sceneLayout";

export function Stacks() {
  const booksRef = useRef<THREE.InstancedMesh | null>(null);
  const shadows = useArchiveStore((s) => s.qualityTier) === "high";

  // Generate thousands of books on the shelves procedurally
  const { bookMatrices, bookColors } = useMemo(() => {
    const matrices: THREE.Matrix4[] = [];
    const colors: THREE.Color[] = [];
    const dummy = new THREE.Object3D();
    const placements = shelfSides.flatMap((side) => booksForSide(side));

    for (const book of placements) {
      dummy.position.set(book.x, book.y, book.z);
      dummy.rotation.set(0, 0, book.tilt);
      dummy.scale.set(book.width, book.height, book.depth);
      dummy.updateMatrix();
      matrices.push(dummy.matrix.clone());
      colors.push(new THREE.Color(book.color));
    }

    const galleryColors = ["#4a342c", "#2c3848", "#3a4638", "#5a4030"];
    for (let level = 0; level < 4; level += 1) {
      const yPos = 1.15 + level * 1.05;
      for (let book = 0; book < 26; book += 1) {
        if (book > 10 && book < 16) continue;
        const xPos = -4.2 + (book / 26) * 8.4;
        dummy.position.set(xPos, yPos, -3.85);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(0.11, 0.62, 0.34);
        dummy.updateMatrix();
        matrices.push(dummy.matrix.clone());
        colors.push(new THREE.Color(galleryColors[(book + level) % galleryColors.length]));
      }
    }

    return { bookMatrices: matrices, bookColors: colors };
  }, []);

  useLayoutEffect(() => {
    const mesh = booksRef.current;
    if (!mesh) return;
    for (let i = 0; i < bookMatrices.length; i += 1) {
      mesh.setMatrixAt(i, bookMatrices[i]);
      mesh.setColorAt(i, bookColors[i]);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [bookMatrices, bookColors]);

  return (
    <group>
      {/* Dark Flagstone Archive Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[24, 30]} />
        <NoisyStandardMaterial
          color={materialRoles.stone.color}
          roughness={materialRoles.stone.roughness}
          metalness={materialRoles.stone.metalness}
          repeat={materialRoles.stone.repeat}
          offset={materialRoles.stone.offset}
          strength={materialRoles.stone.strength}
        />
      </mesh>

      <instancedMesh
        ref={booksRef}
        args={[undefined, undefined, bookMatrices.length]}
        castShadow={shadows}
        receiveShadow={shadows}
      >
        <boxGeometry args={[1, 1, 1]} />
        <NoisyStandardMaterial
          color={materialRoles.cloth.color}
          roughness={materialRoles.cloth.roughness}
          metalness={materialRoles.cloth.metalness}
          repeat={materialRoles.cloth.repeat}
          offset={materialRoles.cloth.offset}
          strength={materialRoles.cloth.strength}
          bump={false}
        />
      </instancedMesh>

      {shelfCases.map((shelfCase) => (
        <mesh
          key={shelfCase.id}
          position={shelfCase.position}
          castShadow={shadows}
          receiveShadow
        >
          <boxGeometry args={shelfCase.size} />
          <NoisyStandardMaterial
            color={materialRoles.stone.color}
            roughness={0.94}
            metalness={0.01}
            repeat={[2.2, 3.4]}
            offset={[0.2, shelfCase.id === "left" ? 0.1 : 0.66]}
            strength={0.28}
            bump={false}
          />
        </mesh>
      ))}

      <mesh position={[-2.4, 3.2, 6.2]} castShadow={shadows}>
        <cylinderGeometry args={[0.3, 0.36, 6.5, 12]} />
        <NoisyStandardMaterial
          color="#4d5968"
          roughness={0.86}
          metalness={0.08}
          repeat={[2, 4]}
          strength={0.32}
          bump={false}
        />
      </mesh>
      <mesh position={[2.4, 3.2, 6.2]} castShadow={shadows}>
        <cylinderGeometry args={[0.3, 0.36, 6.5, 12]} />
        <NoisyStandardMaterial
          color="#4d5968"
          roughness={0.86}
          metalness={0.08}
          repeat={[2, 4]}
          strength={0.32}
          bump={false}
        />
      </mesh>

      <mesh position={[0, 3.5, -4.2]}>
        <boxGeometry args={[14, 7.5, 0.4]} />
        <NoisyStandardMaterial
          color="#2e3846"
          roughness={0.92}
          metalness={0.03}
          repeat={[3, 2]}
          strength={0.36}
          bump={false}
        />
      </mesh>
    </group>
  );
}
