"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { ArchiveMaterial } from "./ArchiveMaterial";
import { useArchiveStore } from "../store";
import { sceneUniforms } from "../uniforms";
import { anchorRegistry } from "../threads/anchors";
import { archiveDirector } from "../director";

export const basinPosition: [number, number, number] = [0.95, 0, -0.45];
export const basinScale: [number, number, number] = [1.2, 1.15, 1.2];
const liquidHeight = 1.26;
const vertex = `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;
const fragment = `
  uniform float uTime;
  uniform float uEnergy;
  uniform float uRipple;
  uniform float uHover;
  uniform float uEvidence;
  varying vec2 vUv;
  varying vec3 vWorld;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x),
      mix(hash(i + vec2(0., 1.)), hash(i + vec2(1.)), f.x), f.y);
  }
  float field(vec2 p) { return noise(p) * .6 + noise(p * 2.03 + 3.) * .27 + noise(p * 4.1) * .13; }
  void main() {
    vec2 p = (vUv - .5) * 2.;
    float r = length(p);
    float a = atan(p.y, p.x);
    float time = uTime * (.035 + uEnergy * .045);
    vec2 flow = vec2(cos(a + r * 2.6 + time), sin(a + r * 2.6 + time)) * r;
    float n = field(flow * 5. + vec2(time, -time));
    float swirl = sin(a * 3. + r * 18. - time * 3. + n * 5.);
    float strands = pow(max(0., 1. - abs(swirl)), 14.) * smoothstep(.1, .85, r);
    float fine = pow(max(0., 1. - abs(sin(a * 5. + r * 37. + n * 7. + time))), 22.);
    float ring = exp(-pow((r - uRipple * 1.35) * 24., 2.)) * sin(uRipple * 3.14159);
    vec3 deep = vec3(.025, .052, .066);
    vec3 silver = vec3(.32, .42, .46);
    vec3 col = mix(deep, silver, .12 + n * .36 + strands * .65);
    col += vec3(.4, .56, .61) * (fine * .22 + ring * .32);
    vec3 viewDir = normalize(cameraPosition - vWorld);
    float fresnel = pow(1. - max(0., dot(viewDir, vec3(0., 1., 0.))), 3.);
    float windowLight = pow(max(0., dot(reflect(-viewDir, vec3(0., 1., 0.)),
      normalize(vec3(-.7, 1., -.4)))), 28.);
    col += vec3(.42, .57, .62) * (fresnel * .13 + windowLight * .12);
    col += vec3(.18, .29, .32) * pow(r, 14.) * (.3 + uHover);
    col *= 1. + uEnergy * .24 + uEvidence * .08;
    gl_FragColor = vec4(col, 1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
const mistFragment = `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    float center = .5 + sin(vUv.y * 8. - uTime * .35) * .12;
    float w = exp(-pow((vUv.x - center) * 8., 2.));
    float fade = sin(vUv.y * 3.14159);
    gl_FragColor = vec4(.64, .77, .8, w * fade * .11);
  }
`;

function RimInlays() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => {
    const circle = new THREE.TorusGeometry(0.05, 0.0045, 4, 18);
    const stroke = new THREE.BoxGeometry(0.005, 0.056, 0.006);
    const stroke2 = stroke.clone();
    stroke.rotateZ(0.55);
    stroke2.rotateZ(-0.55);
    const merged = mergeGeometries([circle, stroke, stroke2])!;
    circle.dispose();
    stroke.dispose();
    stroke2.dispose();
    return merged;
  }, []);
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      dummy.position.set(Math.sin(a) * 1.075, 1.14, Math.cos(a) * 1.075);
      dummy.rotation.set(0, a, 0);
      dummy.updateMatrix();
      ref.current?.setMatrixAt(i, dummy.matrix);
    }
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={ref} args={[geometry, undefined, 16]}>
      <ArchiveMaterial role="brass" color="#a98f62" roughness={0.52} />
    </instancedMesh>
  );
}

export function PensieveBasin() {
  const quality = useArchiveStore((state) => state.qualityTier);
  const lightMode = useArchiveStore((state) => state.lightMode);
  const world = useRef(new THREE.Vector3(...basinPosition));
  const light = useRef<THREE.PointLight>(null);
  const surface = useRef<THREE.ShaderMaterial>(null);
  const mist = useRef<(THREE.ShaderMaterial | null)[]>([]);
  const count = lightMode || quality === "low" ? 48 : 96;
  const profile = useMemo(
    () =>
      [
        [0.29, 0.82],
        [0.4, 0.88],
        [0.66, 0.93],
        [0.87, 1.01],
        [1.03, 1.1],
        [1.1, 1.2],
        [1.13, 1.28],
        [1.12, 1.32],
        [1.04, 1.33],
        [0.99, 1.28],
        [0.88, 1.15],
        [0.65, 1.02],
        [0.12, 0.98],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
    [],
  );
  const pedestal = useMemo(
    () =>
      [
        [0, 0.02],
        [0.57, 0.02],
        [0.61, 0.07],
        [0.6, 0.12],
        [0.49, 0.17],
        [0.38, 0.2],
        [0.34, 0.29],
        [0.31, 0.61],
        [0.36, 0.68],
        [0.45, 0.72],
        [0.47, 0.78],
        [0.41, 0.84],
        [0, 0.84],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
    [],
  );
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uEnergy: { value: 0.12 },
      uRipple: { value: 0 },
      uHover: { value: 0 },
      uEvidence: { value: 0 },
    }),
    [],
  );
  const mistUniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  useEffect(
    () =>
      anchorRegistry.registerWorld("pensieve-surface", () => {
        world.current.set(
          basinPosition[0],
          liquidHeight * basinScale[1],
          basinPosition[2],
        );
        return world.current;
      }),
    [],
  );

  useFrame((_, delta) => {
    const state = useArchiveStore.getState();
    const still =
      state.reducedMotion ||
      state.quietReading ||
      state.lightMode ||
      state.qualityTier === "low";
    const u = surface.current?.uniforms;
    if (!u) return;
    if (!still) u.uTime.value += Math.min(delta, 0.05);
    mist.current.forEach((material) => {
      if (material) material.uniforms.uTime.value = u.uTime.value;
    });
    const basin = sceneUniforms.basin;
    u.uEnergy.value = basin.energy;
    u.uRipple.value = basin.ripple;
    u.uHover.value = basin.hover;
    u.uEvidence.value = basin.evidence;
    if (light.current)
      light.current.intensity =
        (0.95 + basin.energy * 0.4) *
        (1 - sceneUniforms.environment.hush * 0.3);
  });

  return (
    <group
      position={basinPosition}
      scale={basinScale}
      name="PensieveBasin"
      onClick={(event) => {
        event.stopPropagation();
        archiveDirector.stir();
      }}
    >
      <mesh castShadow receiveShadow>
        <latheGeometry args={[pedestal, count]} />
        <ArchiveMaterial role="limestone" color="#867b6a" repeat={[3, 2]} />
      </mesh>
      <mesh castShadow receiveShadow>
        <latheGeometry args={[profile, count]} />
        <ArchiveMaterial role="limestone" color="#b6ac98" repeat={[5, 2]} />
      </mesh>
      {[
        { y: 1.3, r: 1.09 },
        { y: 1.11, r: 1.02 },
        { y: 0.74, r: 0.45 },
      ].map((ring) => (
        <mesh
          key={ring.y}
          position={[0, ring.y, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[ring.r, 0.011, 6, count]} />
          <ArchiveMaterial role="brass" color="#a48d60" />
        </mesh>
      ))}
      <RimInlays />
      <mesh
        position={[0, liquidHeight, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        name="MemorySurface"
      >
        <circleGeometry args={[1.012, count]} />
        <shaderMaterial
          ref={surface}
          uniforms={uniforms}
          vertexShader={vertex}
          fragmentShader={fragment}
        />
      </mesh>
      {quality !== "low" &&
        !lightMode &&
        [-0.5, 0.15, 0.65].map((x, i) => (
          <mesh
            key={x}
            position={[x, 1.59, i % 2 ? -0.3 : 0.12]}
            rotation={[0, i * 0.9, 0]}
          >
            <planeGeometry args={[0.7, 0.7]} />
            <shaderMaterial
              ref={(material) => {
                mist.current[i] = material;
              }}
              uniforms={mistUniforms}
              vertexShader={vertex}
              fragmentShader={mistFragment}
              transparent
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      <pointLight
        ref={light}
        position={[0, 1.55, 0]}
        color="#bedce3"
        intensity={1}
        distance={4.7}
        decay={2}
      />
      <pointLight
        position={[0, 1.15, 1.25]}
        color="#b6ced4"
        intensity={1.25}
        distance={3.5}
        decay={2}
      />
    </group>
  );
}
