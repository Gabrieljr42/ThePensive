"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { sceneUniforms } from "../uniforms";
import { anchorRegistry } from "../threads/anchors";

const CANDIDATE_POSITIONS: [number, number, number][] = [
  [-2.2, 2.2, 0.4], // 0: Top rank 1 (PoA Ch. 10 gift)
  [-2.4, 1.4, -0.6], // 1: Top rank 2 (PoA Ch. 10 creators)
  [2.1, 2.8, -0.2], // 2: Top rank 3 (PoA Ch. 18 identities)
  [2.5, 1.6, 1.2], // 3: Discarded
  [-2.6, 3.1, 1.5], // 4: Discarded
  [2.7, 2.1, 2.1], // 5: Discarded
  [-1.6, 3.6, -2.8], // 6: Discarded
  [1.5, 3.5, -2.9], // 7: Discarded
];

export function RetrievalNodes() {
  const groupRef = useRef<THREE.Group | null>(null);
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);

  useEffect(() => {
    // Register anchors for the 8 candidate nodes
    const unsubs = CANDIDATE_POSITIONS.map((pos, idx) => {
      const vec = new THREE.Vector3(...pos);
      return anchorRegistry.registerWorld(`retrieval-cand-${idx}`, () => vec);
    });

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, []);

  useFrame(() => {
    for (let i = 0; i < 8; i++) {
      const mesh = meshRefs.current[i];
      if (!mesh) continue;

      const awakening = sceneUniforms.retrieval.candidateAwakening[i] || 0;
      const rerank = sceneUniforms.retrieval.candidateRerank[i] !== undefined
        ? sceneUniforms.retrieval.candidateRerank[i]
        : 1;

      const intensity = awakening * rerank;

      mesh.scale.setScalar(0.04 + intensity * 0.12);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = intensity * 0.95;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {CANDIDATE_POSITIONS.map((pos, idx) => {
        const isTop = idx < 3;
        const color = isTop ? "#ffb347" : "#ffcc80";

        return (
          <group key={idx} position={pos}>
            {/* Glowing Star Point */}
            <mesh
              ref={(el) => {
                meshRefs.current[idx] = el;
              }}
            >
              <sphereGeometry args={[1, 16, 16]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0}
                blending={THREE.AdditiveBlending}
              />
            </mesh>

            {/* Subtle Point Light for Top-3 Surviving Sources */}
            {isTop && (
              <pointLight
                color="#ffaa33"
                intensity={0.6}
                distance={2.5}
                decay={2}
              />
            )}
          </group>
        );
      })}
    </group>
  );
}
