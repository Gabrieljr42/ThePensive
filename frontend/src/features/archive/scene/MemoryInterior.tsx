"use client";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { ArchiveMaterial } from "./ArchiveMaterial";
import { sceneUniforms } from "../uniforms";
import { useArchiveStore } from "../store";
import { MemoryBackdrop } from "./MemoryBackdrop";
import { MemoryFolios } from "./MemoryFolios";

function hash(n: number) {
  return (((Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1) + 1) % 1;
}
function advancePageShader(shader: THREE.ShaderMaterial, delta: number) {
  shader.uniforms.uTime.value += Math.min(delta, 0.04);
}
function path(t: number, side: number, lane: number) {
  const z = -3 - t * 42;
  return new THREE.Vector3(
    side * (1.4 + Math.sin(t * 8 + lane) * 0.8 + lane * 0.32),
    0.65 + Math.sin(t * 7 + lane * 0.6) * 0.65 + t * 1.1,
    z,
  );
}
function ribbon(side: number, lanes: number, width: number) {
  const vertices: number[] = [],
    uvs: number[] = [],
    index: number[] = [];
  for (let lane = 0; lane < lanes; lane++) {
    const start = vertices.length / 3;
    for (let i = 0; i <= 100; i++) {
      const point = path(i / 100, side, lane);
      vertices.push(
        point.x - width / 2,
        point.y,
        point.z,
        point.x + width / 2,
        point.y,
        point.z,
      );
      uvs.push(0, i / 100, 1, i / 100);
      if (i < 100) {
        const a = start + i * 2;
        index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}
const pageVertex = `
  uniform float uTime; varying vec2 vUv; varying float vDepth;
  void main(){ vUv = uv;
    vec3 pos = position; pos.z += sin(uv.y * 3.14159) * .13;
    vec4 world = instanceMatrix * vec4(pos, 1.);
    world.y += sin(uTime * .25 + world.z * .31) * .08;
    vec4 view = modelViewMatrix * world; vDepth = -view.z;
    gl_Position = projectionMatrix * view;
  }`;
const pageFragment = `
  varying vec2 vUv; varying float vDepth;
  void main(){
    vec2 p = vUv;
    float edge = min(min(p.x, 1.-p.x), min(p.y, 1.-p.y));
    float ruled = step(.94, fract(p.y * 23.)) * step(.15, p.x) * step(p.x, .85);
    float ink = pow(max(0., 1. - abs(sin(p.y * 72. + sin(p.x * 19. + floor(p.y * 23.)) * 1.5))), 15.) * step(.12,p.x) * step(p.x,.88);
    float seal = smoothstep(.075, .06, length(p - vec2(.5, .77)));
    vec3 col = mix(vec3(.24,.205,.145), vec3(.045,.05,.047), ink * .56 + seal * .22 + ruled * .03);
    col *= .64 + smoothstep(0., .05, edge) * .32;
    col = mix(col, vec3(.042,.064,.08), 1. - exp(-vDepth * .015));
    gl_FragColor = vec4(col, .96);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
const flowVertex = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`;
const flowFragment = `
  uniform float uTime; uniform vec3 uColor; uniform float uActive; varying vec2 vUv;
  void main(){
    float edge = pow(max(0., 1. - abs(vUv.x - .5) * 2.), 1.8);
    float current = pow(.5 + .5 * sin(vUv.y * 28. + uTime * .45), 7.);
    gl_FragColor = vec4(uColor * (.5 + current * .4), edge * (.22 + current * .35) * uActive);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

function MemoryPages({ count }: { count: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const requestId = useArchiveStore((s) => s.requestId);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: pageVertex,
        fragmentShader: pageFragment,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: true,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const seed = i * 7 + requestId * 19;
      const side = i % 2 ? 1 : -1;
      const t = i / count;
      dummy.position.set(
        side * (2.4 + hash(seed) * 2.1),
        0.85 + hash(seed + 2) * 3.9,
        -3 - t * 45,
      );
      dummy.rotation.set(
        (hash(seed + 3) - 0.5) * 0.55,
        side * -0.35 + (hash(seed + 4) - 0.5) * 0.6,
        (hash(seed + 5) - 0.5) * 0.3,
      );
      dummy.scale.setScalar(0.65 + hash(seed + 6) * 0.65);
      dummy.updateMatrix();
      ref.current?.setMatrixAt(i, dummy.matrix);
    }
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  }, [count, requestId]);
  useFrame((_, delta) => {
    const shader = ref.current?.material as THREE.ShaderMaterial | undefined;
    if (
      sceneUniforms.dive.interior &&
      shader &&
      !useArchiveStore.getState().journeyPaused
    )
      advancePageShader(shader, delta);
  });
  return (
    <instancedMesh
      ref={ref}
      name="MemoryPages"
      args={[undefined, material, count]}
      frustumCulled={false}
    >
      <planeGeometry args={[0.95, 1.3, 1, 6]} />
    </instancedMesh>
  );
}
function MemoryArches() {
  const shape = useMemo(() => {
    const halves = [-1, 1].map(
      (side) =>
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(side * 4.5, 0, 0),
            new THREE.Vector3(side * 4, 1.7, 0),
            new THREE.Vector3(side * 2.7, 3.8, 0),
            new THREE.Vector3(0, 5.3, 0),
          ]),
          32,
          0.065,
          6,
          false,
        ),
    );
    const merged = mergeGeometries(halves)!;
    halves.forEach((g) => g.dispose());
    return merged;
  }, []);
  useEffect(() => () => shape.dispose(), [shape]);
  const arches = useRef<THREE.InstancedMesh>(null);
  const pillars = useRef<THREE.InstancedMesh>(null);
  const inlays = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 3; i++) {
      const z = -14 - i * 18;
      dummy.position.set(0, 3.6, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1.5, 1.15, 1);
      dummy.updateMatrix();
      arches.current?.setMatrixAt(i, dummy.matrix);
      dummy.scale.set(1.53, 1.173, 1);
      dummy.updateMatrix();
      inlays.current?.setMatrixAt(i, dummy.matrix);
      for (let side = 0; side < 2; side++) {
        dummy.position.set(side ? 6.75 : -6.75, 1.55, z);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        pillars.current?.setMatrixAt(i * 2 + side, dummy.matrix);
      }
    }
    for (const ref of [arches, pillars, inlays])
      if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <>
      <instancedMesh ref={arches} args={[undefined, undefined, 3]}>
        <primitive object={shape} attach="geometry" />
        <ArchiveMaterial role="slate" color="#374952" roughness={0.91} />
      </instancedMesh>
      <instancedMesh ref={pillars} args={[undefined, undefined, 6]}>
        <boxGeometry args={[0.22, 4.1, 0.32]} />
        <ArchiveMaterial role="slate" color="#34434c" roughness={0.92} />
      </instancedMesh>
      <instancedMesh ref={inlays} args={[undefined, undefined, 3]}>
        <primitive object={shape} attach="geometry" />
        <meshStandardMaterial
          color="#9e8c63"
          metalness={0.65}
          roughness={0.6}
          transparent
          opacity={0.18}
          depthWrite={false}
        />
      </instancedMesh>
    </>
  );
}
export function MemoryInterior() {
  const root = useRef<THREE.Group>(null);
  const tier = useArchiveStore((s) => s.qualityTier);
  const mode = useArchiveStore((s) => s.run?.mode ?? s.mode);
  const golden = useRef<THREE.ShaderMaterial>(null),
    silver = useRef<THREE.ShaderMaterial>(null);
  const warm = useRef<THREE.PointLight>(null);
  const resources = useMemo(
    () => ({ gold: ribbon(-1, 5, 0.055), silver: ribbon(1, 3, 0.48) }),
    [],
  );
  const goldUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color("#ceb17a") },
      uActive: { value: 1 },
    }),
    [],
  );
  const silverUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color("#b9d4d7") },
      uActive: { value: 1 },
    }),
    [],
  );
  useEffect(
    () => () => {
      resources.gold.dispose();
      resources.silver.dispose();
    },
    [resources],
  );
  useFrame((_, delta) => {
    const visible = sceneUniforms.dive.interior > 0.5;
    if (root.current) root.current.visible = visible;
    if (!visible) return;
    const state = useArchiveStore.getState();
    if (state.journeyPaused) return;
    const slow =
      state.inquiryStartedAt && Date.now() - state.inquiryStartedAt > 20000
        ? 0.35
        : 1;
    for (const material of [golden.current, silver.current])
      if (material)
        material.uniforms.uTime.value += Math.min(delta, 0.04) * slow;
    if (warm.current)
      warm.current.intensity =
        14 + Math.sin(goldUniforms.uTime.value * 0.24) * 1.2;
  });
  return (
    <group ref={root} visible={false} name="MemoryInterior">
      <MemoryBackdrop />
      <hemisphereLight args={["#acccd4", "#25252c", 1.25]} />
      <pointLight
        position={[0, 6, -3]}
        color="#acc8d0"
        intensity={48}
        distance={35}
        decay={2}
      />
      <pointLight
        ref={warm}
        position={[-4, 3, -12]}
        color="#c9a267"
        intensity={14}
        distance={25}
        decay={2}
      />
      <pointLight
        position={[4, 4, -22]}
        color="#85abbc"
        intensity={24}
        distance={35}
        decay={2}
      />
      <MemoryArches />
      <MemoryPages count={tier === "high" ? 64 : tier === "mid" ? 32 : 14} />
      <MemoryFolios />
      <mesh position={[0, -0.55, -30]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[70, 110]} />
        <meshStandardMaterial
          color="#182c35"
          roughness={0.45}
          metalness={0.22}
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </mesh>
      {mode !== "full_context" && (
        <mesh geometry={resources.gold}>
          <shaderMaterial
            ref={golden}
            uniforms={goldUniforms}
            vertexShader={flowVertex}
            fragmentShader={flowFragment}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      {mode !== "rag" && (
        <mesh geometry={resources.silver}>
          <shaderMaterial
            ref={silver}
            uniforms={silverUniforms}
            vertexShader={flowVertex}
            fragmentShader={flowFragment}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
