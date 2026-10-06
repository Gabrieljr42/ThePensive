"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { sceneUniforms } from "../uniforms";

export function Moonbeam() {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const matRef = useRef<THREE.ShaderMaterial | null>(null);

  useEffect(() => {
    matRef.current = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0.8 },
        uColor: { value: new THREE.Color("#88b8cc") },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPosition.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uIntensity;
        uniform vec3 uColor;
        varying vec2 vUv;
        varying vec3 vWorldPos;

        void main() {
          // Soft radial falloff across the beam cone
          float centerDist = abs(vUv.x - 0.5) * 2.0;
          float sideFade = smoothstep(1.0, 0.1, centerDist);

          // Longitudinal falloff (bright at window, soft as it hits the aisle)
          float lengthFade = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.5, vUv.y);

          // Subtle turbulence
          float noise = sin(vWorldPos.y * 2.0 + uTime * 0.4) * 0.08 +
                        cos(vWorldPos.x * 3.0 - uTime * 0.3) * 0.06;

          float alpha = (sideFade * lengthFade + noise * sideFade) * uIntensity * 0.22;

          gl_FragColor = vec4(uColor, clamp(alpha, 0.0, 1.0));
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    if (meshRef.current) {
      meshRef.current.material = matRef.current;
    }
  }, []);

  useFrame((_, delta) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value += delta;
      const hushMult = 1 - sceneUniforms.environment.hush * 0.6;
      matRef.current.uniforms.uIntensity.value =
        sceneUniforms.environment.beamIntensity * hushMult;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[0.4, 2.5, 0.8]}
      rotation={[0.38, -0.22, -0.25]}
    >
      <cylinderGeometry args={[0.5, 2.2, 7.5, 16, 1, true]} />
    </mesh>
  );
}
