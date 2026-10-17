"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useArchiveStore } from "../store";
import { presentMemories } from "../presentation";
import { sceneUniforms } from "../uniforms";
import { anchorRegistry } from "../threads/anchors";

export function RetrievalNodes() {
  const run = useArchiveStore((s) => s.run);
  const phase = useArchiveStore((s) => s.phase);
  const nodes = useMemo(() => presentMemories(run), [run]);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useEffect(() => {
    const unsubs = nodes.map((node) => {
      const position = new THREE.Vector3(...node.position);
      return anchorRegistry.registerWorld("memory-" + node.id, () => position);
    });
    return () => unsubs.forEach((unsubscribe) => unsubscribe());
  }, [nodes]);
  useFrame(() => {
    const energy = sceneUniforms.basin.energy;
    refs.current.forEach((mesh, index) => {
      if (!mesh || !nodes[index]) return;
      (mesh.material as THREE.MeshBasicMaterial).opacity = nodes[index].selected
        ? Math.min(0.8, energy * 0.8)
        : Math.max(0, energy - 0.2) * 0.14;
    });
  });
  return (
    <group
      visible={
        phase === "reading" || phase === "evidence" || phase === "retrieving"
      }
    >
      {nodes.map((node, index) => (
        <mesh
          key={node.id}
          ref={(mesh) => {
            refs.current[index] = mesh;
          }}
          position={node.position}
        >
          <sphereGeometry args={[node.selected ? 0.038 : 0.022, 10, 8]} />
          <meshBasicMaterial
            color={node.selected ? "#e6c284" : "#a9b5bd"}
            transparent
            opacity={0}
          />
        </mesh>
      ))}
    </group>
  );
}
