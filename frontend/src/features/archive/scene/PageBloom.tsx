"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useArchiveStore } from "../store";
import { sceneUniforms } from "../uniforms";
import { basinPosition, basinScale } from "./PensieveBasin";

export function PageBloom() {
  const run = useArchiveStore((s) => s.run);
  const phase = useArchiveStore((s) => s.phase);
  const ref = useRef<THREE.Mesh>(null);
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-1.35, 1.05, 0.7),
        new THREE.Vector3(-0.55, 1.9, 0.1),
        new THREE.Vector3(0.35, 1.8, -0.25),
        new THREE.Vector3(
          basinPosition[0],
          1.26 * basinScale[1],
          basinPosition[2],
        ),
      ]),
    [],
  );
  const full = run?.branches.find((branch) => branch.method === "full_context");
  useFrame(() => {
    if (ref.current)
      (ref.current.material as THREE.MeshBasicMaterial).opacity =
        Math.max(0, sceneUniforms.basin.energy - 0.17) * 0.44;
  });
  if (!full || full.context.supplied_source_count === 0) return null;
  return (
    <mesh ref={ref} visible={phase === "reading" || phase === "retrieving"}>
      <tubeGeometry args={[curve, 36, 0.014, 4, false]} />
      <meshBasicMaterial
        color="#a7d4df"
        transparent
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  );
}
