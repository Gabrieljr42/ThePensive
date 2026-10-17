"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { ArchiveMaterial } from "@/features/archive/scene/ArchiveMaterial";
import { fbmNoise, hash2 } from "@/features/archive/scene/noise";
import { useArchiveStore } from "@/features/archive/store";
import { sceneUniforms } from "@/features/archive/uniforms";
import { anchorRegistry } from "@/features/archive/threads/anchors";
import { archiveDirector } from "@/features/archive/director";
import { basinPosition, basinScale, liquidHeight } from "@/features/archive/basin";

const vertex = `
  uniform float uDepression;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec3 pos = position;
    float r = length(position.xy);
    float wave = sin(r * 36.0 - uTime * 1.7) * 0.013
      + sin(position.x * 18.0 + position.y * 14.0 + uTime * 0.85) * 0.005;
    pos.z += wave;
    pos.z -= uDepression * .25 * pow(max(0., 1. - r), 2.);
    vec4 world = modelMatrix * vec4(pos, 1.0);
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
  float rippleHeight(vec2 q) {
    float rr = length(q);
    return sin(rr * 34.0 - uTime * 1.7) * 0.55
      + sin(q.x * 16.0 + q.y * 12.0 + uTime * 0.8) * 0.45;
  }
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
    float e = 0.04;
    float h0 = rippleHeight(p);
    float dhx = rippleHeight(p + vec2(e, 0.0)) - h0;
    float dhy = rippleHeight(p + vec2(0.0, e)) - h0;
    vec3 nrm = normalize(vec3(-dhx * 2.4, 1.0, dhy * 2.4));
    vec3 deep = vec3(.012, .032, .044);
    vec3 silver = vec3(.20, .30, .34);
    vec3 col = mix(deep, silver, .14 + n * .32 + strands * .55);
    col += vec3(.32, .44, .48) * (fine * .16 + ring * .26);
    col += vec3(.36, .48, .52) * smoothstep(0.55, 1.0, h0) * 0.05;
    vec3 viewDir = normalize(cameraPosition - vWorld);
    float fresnel = pow(1. - max(0., dot(viewDir, nrm)), 3.);
    float windowLight = pow(max(0., dot(reflect(-viewDir, nrm),
      normalize(vec3(-.7, 1., -.4)))), 28.);
    col += vec3(.40, .54, .58) * (fresnel * .1 + windowLight * .1);
    col += vec3(.16, .26, .29) * pow(r, 14.) * (.3 + uHover);
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

const stoneCache = new Map<
  string,
  { color: THREE.DataTexture; detail: THREE.DataTexture }
>();

function carvedStoneMaps(repeat: [number, number]) {
  const key = repeat.join(",") + ":v2";
  const existing = stoneCache.get(key);
  if (existing) return existing;
  const size = 128;
  const color = new Uint8Array(size * size * 4);
  const detail = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const n = fbmNoise(u * 5.5 + 1.7, v * 5.5 + 4.2, 4);
      const fine = hash2(x, y);
      const pit = Math.pow(fine, 16);
      const shade = 0.7 + n * 0.24 - pit * 0.32;
      const relief = 0.5 + n * 0.28 - pit * 0.55;
      const i = (y * size + x) * 4;
      const byte = Math.round(Math.min(1, Math.max(0, shade)) * 255);
      color[i] = color[i + 1] = color[i + 2] = byte;
      color[i + 3] = 255;
      const bump = Math.round(Math.min(1, Math.max(0, relief)) * 255);
      detail[i] = detail[i + 1] = detail[i + 2] = bump;
      detail[i + 3] = 255;
    }
  }
  function make(data: Uint8Array, srgb: boolean) {
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.needsUpdate = true;
    return texture;
  }
  const maps = { color: make(color, true), detail: make(detail, false) };
  stoneCache.set(key, maps);
  return maps;
}

function CarvedStone({
  color,
  repeat,
  side = THREE.FrontSide,
}: {
  color: string;
  repeat: [number, number];
  side?: THREE.Side;
}) {
  const rx = repeat[0];
  const ry = repeat[1];
  const maps = useMemo(() => carvedStoneMaps([rx, ry]), [rx, ry]);
  return (
    <meshStandardMaterial
      color={color}
      map={maps.color}
      roughness={0.91}
      metalness={0.02}
      bumpMap={maps.detail}
      bumpScale={0.14}
      side={side}
    />
  );
}

function RimInlays() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => {
    const circle = new THREE.TorusGeometry(0.045, 0.004, 4, 16);
    const stroke = new THREE.BoxGeometry(0.005, 0.05, 0.006);
    const stroke2 = stroke.clone();
    stroke.rotateZ(0.55);
    stroke2.rotateZ(-0.55);
    const merged = mergeGeometries([circle, stroke, stroke2]);
    circle.dispose();
    stroke.dispose();
    stroke2.dispose();
    if (!merged) throw new Error("rim inlay failed to merge");
    return merged;
  }, []);
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      dummy.position.set(Math.sin(a) * 1.1, 1.24, Math.cos(a) * 1.1);
      dummy.rotation.set(0, a, 0);
      dummy.updateMatrix();
      ref.current?.setMatrixAt(i, dummy.matrix);
    }
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={ref} args={[geometry, undefined, 16]}>
      <ArchiveMaterial role="brass" color="#a98f62" roughness={0.48} />
    </instancedMesh>
  );
}

function makeSurface(segments: number) {
  const rings = 28;
  const vertices: number[] = [];
  const uv: number[] = [];
  const indices: number[] = [];
  for (let ring = 0; ring <= rings; ring++) {
    const radius = (ring / rings) * 1.012;
    for (let segment = 0; segment <= segments; segment++) {
      const angle = (segment / segments) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      vertices.push(x, y, 0);
      uv.push(x / 2.024 + 0.5, y / 2.024 + 0.5);
      if (ring < rings && segment < segments) {
        const a = ring * (segments + 1) + segment;
        const b = a + segments + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const bowlProfile = [
  [0.16, 0.88],
  [0.46, 0.92],
  [0.74, 1.0],
  [0.96, 1.12],
  [1.06, 1.22],
  [1.09, 1.3],
  [1.14, 1.36],
  [1.18, 1.32],
  [1.14, 1.22],
  [1.02, 1.08],
  [0.8, 0.96],
  [0.52, 0.88],
  [0.38, 0.84],
].map(([x, y]) => new THREE.Vector2(x, y));

const pedestalProfile = [
  [0, 0],
  [0.78, 0],
  [0.8, 0.05],
  [0.64, 0.09],
  [0.68, 0.14],
  [0.48, 0.19],
  [0.32, 0.26],
  [0.26, 0.4],
  [0.24, 0.5],
  [0.34, 0.56],
  [0.36, 0.62],
  [0.26, 0.68],
  [0.32, 0.76],
  [0.48, 0.82],
  [0.52, 0.88],
  [0, 0.88],
].map(([x, y]) => new THREE.Vector2(x, y));

export function PensieveBasin() {
  const quality = useArchiveStore((state) => state.qualityTier);
  const lightMode = useArchiveStore((state) => state.lightMode);
  const world = useRef(new THREE.Vector3(...basinPosition));
  const light = useRef<THREE.PointLight>(null);
  const surface = useRef<THREE.ShaderMaterial>(null);
  const mist = useRef<(THREE.ShaderMaterial | null)[]>([]);
  const count = lightMode || quality === "low" ? 48 : 96;
  const surfaceGeometry = useMemo(() => makeSurface(count), [count]);
  useEffect(() => () => surfaceGeometry.dispose(), [surfaceGeometry]);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uEnergy: { value: 0.12 },
      uRipple: { value: 0 },
      uHover: { value: 0 },
      uEvidence: { value: 0 },
      uDepression: { value: 0 },
    }),
    [],
  );
  const mistUniforms = useMemo(
    () => ({ uTime: { value: 0 }, uDepression: { value: 0 } }),
    [],
  );
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
    u.uDepression.value = sceneUniforms.dive.depression;
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
        <latheGeometry args={[pedestalProfile, count]} />
        <CarvedStone color="#6e6558" repeat={[2, 3]} />
      </mesh>
      <mesh castShadow receiveShadow>
        <latheGeometry args={[bowlProfile, count]} />
        <CarvedStone color="#a89880" repeat={[3, 2]} side={THREE.DoubleSide} />
      </mesh>
      {[
        { y: 1.34, r: 1.15 },
        { y: 1.2, r: 1.08 },
        { y: 0.84, r: 0.46 },
        { y: 0.12, r: 0.7 },
      ].map((ring) => (
        <mesh
          key={ring.y}
          position={[0, ring.y, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[ring.r, 0.012, 8, count]} />
          <ArchiveMaterial role="brass" color="#a48d60" />
        </mesh>
      ))}
      <RimInlays />
      <mesh
        position={[0, liquidHeight, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        name="MemorySurface"
      >
        <primitive object={surfaceGeometry} attach="geometry" />
        <shaderMaterial
          ref={surface}
          uniforms={uniforms}
          vertexShader={vertex}
          fragmentShader={fragment}
          side={THREE.DoubleSide}
        />
      </mesh>
      {quality !== "low" &&
        !lightMode &&
        [-0.5, 0.15, 0.65].map((x, i) => (
          <mesh
            key={x}
            position={[x, 1.62, i % 2 ? -0.3 : 0.12]}
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
        position={[0, 1.72, 0.15]}
        color="#b6ced4"
        intensity={0.55}
        distance={3.2}
        decay={2}
      />
    </group>
  );
}
