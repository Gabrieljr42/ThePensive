"use client";
import { useTexture } from "@react-three/drei";
import { useMemo, useEffect } from "react";
import * as THREE from "three";

/** Far architecture is pre-rendered; foreground sheets, arches and currents remain spatial geometry. */
export function MemoryBackdrop() {
  const loaded = useTexture("/art/memory-interior.webp");
  const texture = useMemo(() => {
    const clone = loaded.clone();
    clone.colorSpace = THREE.SRGBColorSpace;
    clone.needsUpdate = true;
    return clone;
  }, [loaded]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[0, 6, -65]}>
      <planeGeometry args={[96, 60]} />
      <meshBasicMaterial
        map={texture}
        color="#b8c4c9"
        toneMapped={false}
        fog={false}
      />
    </mesh>
  );
}
