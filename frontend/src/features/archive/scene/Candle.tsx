"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { sceneUniforms } from "../uniforms";

export function Candle() {
  const lightRef = useRef<THREE.PointLight | null>(null);
  const flameRef = useRef<THREE.Mesh | null>(null);
  const matRef = useRef<THREE.ShaderMaterial | null>(null);

  useEffect(() => {
    matRef.current = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;

        void main() {
          vec2 p = vUv - vec2(0.5, 0.2);
          float flameWobble = sin(uTime * 14.0 + p.y * 10.0) * 0.04 * p.y;
          p.x += flameWobble;

          float dist = length(vec2(p.x * 2.2, p.y));
          if (dist > 0.48) discard;

          vec3 innerBlue = vec3(0.2, 0.4, 0.9);
          vec3 amberCore = vec3(1.0, 0.65, 0.15);
          vec3 hotWhite = vec3(1.0, 0.96, 0.85);

          vec3 color = mix(amberCore, hotWhite, smoothstep(0.3, 0.0, dist));
          if (p.y < 0.05) {
            color = mix(innerBlue, color, p.y / 0.05);
          }

          float alpha = smoothstep(0.48, 0.1, dist);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    if (flameRef.current) {
      flameRef.current.material = matRef.current;
    }
  }, []);

  useFrame((_, delta) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value += delta;
    }

    const time = performance.now() * 0.003;
    const flicker =
      1.0 +
      Math.sin(time * 7.1) * 0.08 +
      Math.sin(time * 13.7) * 0.05;
    sceneUniforms.environment.candleFlicker = flicker;

    if (lightRef.current) {
      const hushFactor = 1 - sceneUniforms.environment.hush * 0.45;
      const darknessFactor = 1 - sceneUniforms.environment.darkness * 0.7;
      lightRef.current.intensity =
        2.2 * flicker * hushFactor * darknessFactor;
    }
  });

  return (
    <group position={[-1.15, 0.58, 0.35]}>
      {/* Brass Saucer */}
      <mesh position={[0, -0.06, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.15, 0.18, 0.03, 24]} />
        <meshStandardMaterial
          color="#a37e32"
          roughness={0.4}
          metalness={0.8}
        />
      </mesh>

      {/* Wax Candle Stem */}
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.045, 0.05, 0.24, 20]} />
        <meshStandardMaterial
          color="#ede4cb"
          roughness={0.55}
          metalness={0.05}
        />
      </mesh>

      {/* Wick */}
      <mesh position={[0, 0.21, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.025, 8]} />
        <meshBasicMaterial color="#1a1410" />
      </mesh>

      {/* Flame Quad */}
      <mesh ref={flameRef} position={[0, 0.26, 0]}>
        <planeGeometry args={[0.09, 0.14]} />
      </mesh>

      {/* Point Light Casting Warm Candlelight */}
      <pointLight
        ref={lightRef}
        position={[0, 0.27, 0]}
        color="#ffad3b"
        distance={7.0}
        decay={2.0}
        castShadow
        shadow-bias={-0.001}
        shadow-mapSize={[1024, 1024]}
      />
    </group>
  );
}
