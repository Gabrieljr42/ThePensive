"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { sceneUniforms } from "../uniforms";

export function PageBloom() {
  const instancedRef = useRef<THREE.InstancedMesh | null>(null);
  const count = 18;

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const appliedBloom = useRef<number | null>(null);

  useFrame(() => {
    if (!instancedRef.current) return;
    const bloom = sceneUniforms.retrieval.pageBloom;
    if (appliedBloom.current === bloom) return;
    appliedBloom.current = bloom;

    for (let i = 0; i < count; i++) {
      const angle = (i / (count - 1) - 0.5) * 1.1 * bloom;
      const lift = Math.sin((i / (count - 1)) * Math.PI) * 0.16 * bloom;
      const xSpread = (i / (count - 1) - 0.5) * 0.35 * bloom;

      dummy.position.set(-0.7 + xSpread, 1.05 + lift, 2.15);
      dummy.rotation.set(0, 0, angle);
      dummy.scale.set(0.18, 0.28, 1);
      dummy.updateMatrix();

      instancedRef.current.setMatrixAt(i, dummy.matrix);
    }
    instancedRef.current.instanceMatrix.needsUpdate = true;

    const mat = instancedRef.current.material as THREE.MeshBasicMaterial;
    if (mat) {
      mat.opacity = bloom * 0.38;
    }
  });

  return (
    <instancedMesh
      ref={instancedRef}
      args={[undefined, undefined, count]}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        color="#c5e6f5"
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </instancedMesh>
  );
}
