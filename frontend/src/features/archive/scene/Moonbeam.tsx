"use client";

import { useMemo } from "react";
import * as THREE from "three";

/** Soft window haze: feathered planes, with no opaque cone silhouette. */
export function Moonbeam() {
  const uniforms = useMemo(
    () => ({ tint: { value: new THREE.Color("#94adbd") } }),
    [],
  );
  return (
    <mesh position={[0, 2.7, -2.7]} rotation={[0.12, 0, 0]}>
      <planeGeometry args={[3.2, 4.4]} />
      <shaderMaterial
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
        vertexShader={`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`}
        fragmentShader={`uniform vec3 tint; varying vec2 vUv; void main(){
        float edge=pow(max(0.,sin(vUv.x*3.14159)),4.)*pow(max(0.,sin(vUv.y*3.14159)),2.);
        gl_FragColor=vec4(tint,edge*.045);
      }`}
      />
    </mesh>
  );
}
