"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { ArchiveMaterial } from "./ArchiveMaterial";
import { useArchiveStore } from "../store";

const colors = [
  "#423026",
  "#273340",
  "#303c30",
  "#5b392c",
  "#393040",
  "#595042",
  "#272d34",
];

export function Stacks() {
  const books = useRef<THREE.InstancedMesh>(null);
  const lightMode = useArchiveStore((s) => s.lightMode);
  const placements = useMemo(() => {
    const entries: { matrix: THREE.Matrix4; color: THREE.Color }[] = [];
    const dummy = new THREE.Object3D();
    for (const side of [-1, 1]) {
      for (let level = 0; level < (side === -1 ? 6 : 5); level++) {
        for (let slot = 0; slot < 62; slot++) {
          if (
            (slot + level * 3) % 17 === 0 ||
            (side === 1 && slot > 28 && slot < 33)
          )
            continue;
          const h = 0.42 + ((slot * 7 + level * 3) % 9) * 0.028;
          dummy.position.set(
            side * 3.16,
            0.28 + level * 0.78 + h / 2,
            -4.3 + slot * 0.16,
          );
          dummy.rotation.set(
            0,
            side === -1 ? Math.PI / 2 : -Math.PI / 2,
            slot % 13 === 0 ? 0.1 : 0,
          );
          dummy.scale.set(
            0.105 + (slot % 4) * 0.009,
            h,
            0.29 + (slot % 3) * 0.022,
          );
          dummy.updateMatrix();
          entries.push({
            matrix: dummy.matrix.clone(),
            color: new THREE.Color(colors[(slot + level * 2) % colors.length]),
          });
        }
      }
    }
    return entries;
  }, []);
  const joinery = useMemo(() => {
    const pieces: THREE.BufferGeometry[] = [];
    const box = (
      x: number,
      y: number,
      z: number,
      sx: number,
      sy: number,
      sz: number,
    ) => {
      pieces.push(new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z));
    };
    for (const side of [-1, 1]) {
      box(side * 3.51, 2.55, 0.55, 0.095, 5.1, 10.6);
      for (let level = 0; level < 7; level++) {
        box(side * 3.2, 0.23 + level * 0.78, 0.55, 0.7, 0.075, 10.7);
        box(side * 2.85, 0.225 + level * 0.78, 0.55, 0.042, 0.11, 10.7);
      }
      for (const z of [-4.65, -1.22, 2.22, 5.65])
        box(side * 3.2, 2.58, z, 0.73, 5.2, 0.095);
      box(side * 3.15, 0.11, 0.55, 0.82, 0.2, 10.8);
      box(side * 3.15, 5.01, 0.55, 0.82, 0.17, 10.8);
    }
    const merged = mergeGeometries(pieces)!;
    pieces.forEach((piece) => piece.dispose());
    return merged;
  }, []);
  useLayoutEffect(() => {
    const mesh = books.current;
    if (!mesh) return;
    placements.forEach((item, index) => {
      mesh.setMatrixAt(index, item.matrix);
      mesh.setColorAt(index, item.color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [placements, lightMode]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[24, 30]} />
        <ArchiveMaterial role="slate" repeat={[12, 16]} color="#444b54" />
      </mesh>
      <mesh geometry={joinery} receiveShadow>
        <ArchiveMaterial
          role="walnut"
          color="#543a2c"
          repeat={[2, 2]}
          roughness={0.72}
        />
      </mesh>
      <instancedMesh
        ref={books}
        args={[undefined, undefined, placements.length]}
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <ArchiveMaterial role="leather" color="#ffffff" />
      </instancedMesh>
      <mesh position={[0, 0.012, 1.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.65, 3.25]} />
        <ArchiveMaterial role="leather" color="#47372f" repeat={[6, 6]} />
      </mesh>
      <mesh position={[0, 0.014, 1.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.42, 3.02]} />
        <ArchiveMaterial role="leather" color="#302c30" repeat={[6, 6]} />
      </mesh>
    </group>
  );
}
