"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

export function Stacks() {
  const booksRef = useRef<THREE.InstancedMesh | null>(null);
  const floorRef = useRef<THREE.MeshStandardMaterial | null>(null);

  // Generate thousands of books on the shelves procedurally
  const { bookMatrices, bookColors } = useMemo(() => {
    const matrices: THREE.Matrix4[] = [];
    const colors: THREE.Color[] = [];

    const dummy = new THREE.Object3D();
    const leatherPalettes = [
      new THREE.Color("#2a1814"), // dark oxblood
      new THREE.Color("#161a22"), // midnight slate
      new THREE.Color("#1a261c"), // deep forest
      new THREE.Color("#261c14"), // burnt umber
      new THREE.Color("#1c1424"), // ancient purple
      new THREE.Color("#10141a"), // charcoal black
      new THREE.Color("#362512"), // warm calfskin
    ];

    // Left Stacks (Aisle Left)
    const shelfRows = 6;
    const shelfLevels = 5;
    for (let r = 0; r < shelfRows; r++) {
      const zPos = 1.0 + r * 1.4;
      for (let l = 0; l < shelfLevels; l++) {
        const yPos = 0.5 + l * 0.9;
        const booksCount = 14;
        for (let b = 0; b < booksCount; b++) {
          const xPos = -2.6 - (b / booksCount) * 1.8;
          const bookHeight = 0.55 + (Math.sin(b * 3.7 + l) * 0.5 + 0.5) * 0.18;
          const bookWidth = 0.08 + (Math.cos(b * 2.1) * 0.5 + 0.5) * 0.05;
          const bookDepth = 0.38;
          const tilt = (b % 7 === 0) ? 0.06 : 0;

          dummy.position.set(xPos, yPos + bookHeight / 2, zPos);
          dummy.rotation.set(0, 0, tilt);
          dummy.scale.set(bookWidth, bookHeight, bookDepth);
          dummy.updateMatrix();

          matrices.push(dummy.matrix.clone());
          colors.push(leatherPalettes[(b + l * 3 + r) % leatherPalettes.length]);
        }
      }
    }

    // Right Stacks (Aisle Right)
    for (let r = 0; r < shelfRows; r++) {
      const zPos = 1.0 + r * 1.4;
      for (let l = 0; l < shelfLevels; l++) {
        const yPos = 0.5 + l * 0.9;
        const booksCount = 14;
        for (let b = 0; b < booksCount; b++) {
          const xPos = 2.6 + (b / booksCount) * 1.8;
          const bookHeight = 0.55 + (Math.sin(b * 4.2 + l) * 0.5 + 0.5) * 0.18;
          const bookWidth = 0.08 + (Math.cos(b * 1.9) * 0.5 + 0.5) * 0.05;
          const bookDepth = 0.38;
          const tilt = (b % 6 === 0) ? -0.06 : 0;

          dummy.position.set(xPos, yPos + bookHeight / 2, zPos);
          dummy.rotation.set(0, 0, tilt);
          dummy.scale.set(bookWidth, bookHeight, bookDepth);
          dummy.updateMatrix();

          matrices.push(dummy.matrix.clone());
          colors.push(leatherPalettes[(b * 2 + l + r) % leatherPalettes.length]);
        }
      }
    }

    // Distant Gallery Stacks (Backdrop)
    for (let l = 0; l < 4; l++) {
      const yPos = 1.2 + l * 1.1;
      const count = 30;
      for (let b = 0; b < count; b++) {
        // Leave central opening for the great window (-2.2 to 2.2)
        if (b > 11 && b < 19) continue;
        const xPos = -4.5 + (b / count) * 9.0;
        const zPos = -3.8;
        const bookHeight = 0.7;
        const bookWidth = 0.12;

        dummy.position.set(xPos, yPos, zPos);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(bookWidth, bookHeight, 0.4);
        dummy.updateMatrix();

        matrices.push(dummy.matrix.clone());
        colors.push(leatherPalettes[(b + l) % leatherPalettes.length]);
      }
    }

    return { bookMatrices: matrices, bookColors: colors };
  }, []);

  useFrame(() => {
    if (!booksRef.current) return;
    const mesh = booksRef.current;
    if (mesh.count === 0) {
      for (let i = 0; i < bookMatrices.length; i++) {
        mesh.setMatrixAt(i, bookMatrices[i]);
        mesh.setColorAt(i, bookColors[i]);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Dark Flagstone Archive Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[24, 30]} />
        <meshStandardMaterial
          ref={floorRef}
          color="#06090e"
          roughness={0.65}
          metalness={0.25}
        />
      </mesh>

      {/* Instanced Books on Towering Shelves */}
      <instancedMesh
        ref={booksRef}
        args={[undefined, undefined, bookMatrices.length]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.7} metalness={0.15} />
      </instancedMesh>

      {/* Shelving Framework Left */}
      <mesh position={[-3.6, 2.5, 4.5]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 5.2, 8]} />
        <meshStandardMaterial color="#0b0e14" roughness={0.85} />
      </mesh>

      {/* Shelving Framework Right */}
      <mesh position={[3.6, 2.5, 4.5]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 5.2, 8]} />
        <meshStandardMaterial color="#0b0e14" roughness={0.85} />
      </mesh>

      {/* Foreground Grand Arch Pillars */}
      <mesh position={[-2.4, 3.2, 6.2]} castShadow>
        <cylinderGeometry args={[0.3, 0.36, 6.5, 12]} />
        <meshStandardMaterial color="#070a0f" roughness={0.9} />
      </mesh>
      <mesh position={[2.4, 3.2, 6.2]} castShadow>
        <cylinderGeometry args={[0.3, 0.36, 6.5, 12]} />
        <meshStandardMaterial color="#070a0f" roughness={0.9} />
      </mesh>

      {/* Back Wall / Arch Gallery */}
      <mesh position={[0, 3.5, -4.2]}>
        <boxGeometry args={[14, 7.5, 0.4]} />
        <meshStandardMaterial color="#05080c" roughness={0.95} />
      </mesh>
    </group>
  );
}
