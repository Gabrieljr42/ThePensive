"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { useFrame } from "@react-three/fiber";
import { ArchiveMaterial } from "@/features/archive/scene/ArchiveMaterial";
import { useArchiveStore } from "@/features/archive/store";
import { BoundVolume } from "./BoundVolume";

const leathers = [
  "#423026",
  "#273340",
  "#303c30",
  "#5b392c",
  "#393040",
  "#595042",
  "#272d34",
  "#6a322c",
  "#1d2c38",
  "#4e3828",
];
const gilts = ["#c6a45a", "#b9975a", "#d2b56a", "#a88848", "#e0c57a"];

const flyerKeys = new Set([
  "-1:2:30",
  "-1:1:36",
  "1:2:27",
  "1:1:34",
  "-1:1:40",
  "1:1:38",
  "-1:2:26",
  "1:2:42",
]);

function unitBox(w: number, h: number, d: number, x: number, y: number, z: number) {
  return new THREE.BoxGeometry(w, h, d).translate(x, y, z);
}

function merged(parts: THREE.BufferGeometry[]) {
  const geometry = mergeGeometries(parts);
  if (!geometry) throw new Error("book geometry failed to merge");
  parts.forEach((part) => part.dispose());
  return geometry;
}

type Flyer = {
  position: [number, number, number];
  rotationY: number;
  tilt: number;
  thickness: number;
  height: number;
  depth: number;
  leather: string;
  gilt: string;
  phase: number;
  open: number;
};

function FlyingVolume({ flyer }: { flyer: Flyer }) {
  const ref = useRef<THREE.Group>(null);
  const elapsed = useRef(flyer.phase);
  useLayoutEffect(() => {
    ref.current?.traverse((child) => {
      child.raycast = () => undefined;
    });
  }, []);
  useFrame((_, delta) => {
    const group = ref.current;
    if (!group) return;
    const state = useArchiveStore.getState();
    const still =
      state.reducedMotion ||
      state.quietReading ||
      state.lightMode ||
      state.qualityTier === "low";
    if (!still) elapsed.current += Math.min(delta, 0.05);
    const cycle = (elapsed.current % 16) / 16;
    const side = Math.sign(flyer.position[0]) || 1;
    const rise = Math.max(0.24, 2.05 - flyer.position[1]);
    let lift = 0;
    let travel = 0;
    let sway = 0;
    const smooth = (u: number) => u * u * (3 - 2 * u);
    if (cycle < 0.16) {
      const s = smooth(cycle / 0.16);
      lift = rise * s;
      travel = 0.42 * s;
    } else if (cycle < 0.78) {
      const u = (cycle - 0.16) / 0.62;
      lift = rise + Math.sin(u * Math.PI * 2) * 0.07;
      travel = 0.42 + Math.sin(u * Math.PI) * 1.85;
      sway = Math.sin(u * Math.PI * 2 + flyer.phase) * 0.42;
    } else {
      const s = 1 - smooth((cycle - 0.78) / 0.22);
      lift = rise * s;
      travel = 0.42 * s;
    }
    group.position.set(
      flyer.position[0] - side * travel,
      flyer.position[1] + lift,
      flyer.position[2] + sway,
    );
    const bank = still ? 0 : Math.sin(elapsed.current * 0.7 + flyer.phase);
    group.rotation.set(
      bank * 0.35 * Math.min(travel, 1),
      flyer.rotationY + side * Math.min(travel, 1.4) * 0.55,
      flyer.tilt + bank * 0.45 * Math.min(travel, 1),
    );
  });
  return (
    <group ref={ref} position={flyer.position} rotation={[0, flyer.rotationY, flyer.tilt]}>
      <BoundVolume
        height={flyer.height}
        thickness={flyer.thickness}
        depth={flyer.depth}
        leather={flyer.leather}
        gilt={flyer.gilt}
        open={flyer.open}
      />
    </group>
  );
}

export function Stacks() {
  const leatherRef = useRef<THREE.InstancedMesh>(null);
  const paperRef = useRef<THREE.InstancedMesh>(null);
  const giltRef = useRef<THREE.InstancedMesh>(null);
  const lightMode = useArchiveStore((s) => s.lightMode);
  const stock = useMemo(() => {
    const entries: { matrix: THREE.Matrix4; color: THREE.Color; gilt: THREE.Color }[] =
      [];
    const flyers: Flyer[] = [];
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
          const thickness = 0.105 + (slot % 4) * 0.009;
          const depth = 0.29 + (slot % 3) * 0.022;
          const position: [number, number, number] = [
            side * 3.16,
            0.28 + level * 0.78 + h / 2,
            -4.3 + slot * 0.16,
          ];
          const rotationY = side === -1 ? Math.PI / 2 : -Math.PI / 2;
          const tilt = slot % 13 === 0 ? 0.1 : (slot % 19 === 0 ? -0.06 : 0);
          const key = side + ":" + level + ":" + slot;
          if (flyerKeys.has(key)) {
            flyers.push({
              position,
              rotationY,
              tilt,
              thickness,
              height: h,
              depth,
              leather: leathers[(slot + level) % leathers.length],
              gilt: gilts[(slot + level) % gilts.length],
              phase: (slot * 0.37 + level) % 16,
              open: flyers.length % 3 === 0 ? 0.55 : 0,
            });
            continue;
          }
          dummy.position.set(position[0], position[1], position[2]);
          dummy.rotation.set(0, rotationY, tilt);
          dummy.scale.set(thickness, h, depth);
          dummy.updateMatrix();
          entries.push({
            matrix: dummy.matrix.clone(),
            color: new THREE.Color(leathers[(slot + level * 2) % leathers.length]),
            gilt: new THREE.Color(gilts[(slot + level) % gilts.length]),
          });
        }
      }
    }
    return { entries, flyers };
  }, []);
  const paperGeo = useMemo(
    () =>
      merged([
        unitBox(0.64, 0.9, 0.74, 0, 0, -0.05),
        unitBox(0.6, 0.028, 0.04, 0, 0.44, 0.36),
        unitBox(0.6, 0.028, 0.04, 0, -0.44, 0.36),
      ]),
    [],
  );
  const leatherGeo = useMemo(
    () =>
      merged([
        unitBox(0.15, 1, 0.92, -0.425, 0, -0.02),
        unitBox(0.15, 1, 0.92, 0.425, 0, -0.02),
        unitBox(1.04, 1.03, 0.08, 0, 0, 0.44),
        unitBox(0.72, 1.01, 0.05, 0, 0, 0.5),
      ]),
    [],
  );
  const giltGeo = useMemo(
    () =>
      merged(
        [-0.3, 0.02, 0.32].map((y) => unitBox(0.92, 0.045, 0.035, 0, y, 0.53)),
      ),
    [],
  );
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
    const geometry = mergeGeometries(pieces);
    if (!geometry) throw new Error("shelf joinery failed to merge");
    pieces.forEach((piece) => piece.dispose());
    return geometry;
  }, []);
  useLayoutEffect(() => {
    const meshes = [leatherRef.current, paperRef.current, giltRef.current];
    stock.entries.forEach((item, index) => {
      meshes.forEach((mesh) => mesh?.setMatrixAt(index, item.matrix));
      leatherRef.current?.setColorAt(index, item.color);
      giltRef.current?.setColorAt(index, item.gilt);
    });
    meshes.forEach((mesh) => {
      if (!mesh) return;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
  }, [stock, lightMode]);
  const count = stock.entries.length;
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
        ref={paperRef}
        args={[paperGeo, undefined, count]}
        receiveShadow
      >
        <ArchiveMaterial role="paper" color="#e7d5b4" />
      </instancedMesh>
      <instancedMesh
        ref={leatherRef}
        args={[leatherGeo, undefined, count]}
        receiveShadow
      >
        <ArchiveMaterial role="leather" color="#ffffff" />
      </instancedMesh>
      <instancedMesh ref={giltRef} args={[giltGeo, undefined, count]}>
        <ArchiveMaterial role="brass" color="#ffffff" roughness={0.42} />
      </instancedMesh>
      {stock.flyers.map((flyer) => (
        <FlyingVolume key={flyer.position.join(",")} flyer={flyer} />
      ))}
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
