"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

interface CraftedBoxProps {
  size: [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
  radius?: number;
  children: ReactNode;
  castShadow?: boolean;
}

export function CraftedBox({
  size,
  radius = 0.02,
  children,
  ...props
}: CraftedBoxProps) {
  const [x, y, z] = size;
  const geometry = useMemo(
    () =>
      new RoundedBoxGeometry(x, y, z, 1, Math.min(radius, x / 3, y / 3, z / 3)),
    [x, y, z, radius],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh {...props} geometry={geometry} receiveShadow>
      {children}
    </mesh>
  );
}
