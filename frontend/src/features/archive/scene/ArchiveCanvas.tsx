"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CameraRig } from "./CameraRig";
import { Stacks } from "./Stacks";
import { ObservatoryWindow } from "./ObservatoryWindow";
import { Moonbeam } from "./Moonbeam";
import { Dust } from "./Dust";
import { Candle } from "./Candle";
import { Desk } from "./Desk";
import { VolumesRack } from "./Volume3D";
import { RetrievalNodes } from "./RetrievalNodes";
import { PageBloom } from "./PageBloom";
import { useArchiveStore } from "../store";
import { sceneUniforms } from "../uniforms";
import { archiveFrameLoop, pixelRatioCap } from "../archiveBudget";
import { deskPose } from "./sceneLayout";
import { InhabitedAisle, WaxSpill } from "./Inhabited";

function useDocumentHidden() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const sync = () => setHidden(document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);
  return hidden;
}

function ArchiveLights() {
  const moonRef = useRef<THREE.DirectionalLight>(null);
  const warmRef = useRef<THREE.PointLight>(null);
  const tier = useArchiveStore((s) => s.qualityTier);

  useFrame(() => {
    const env = sceneUniforms.environment;
    const revealed = 1 - env.darkness * 0.45;
    const hush = 1 - env.hush * 0.5;
    if (moonRef.current) {
      const cool = 1.15 + (1 - env.warmth) * 0.7;
      moonRef.current.intensity = cool * revealed * hush;
      moonRef.current.color.set(env.warmth > 0.55 ? "#d5e2ea" : "#c3dff0");
    }
    if (warmRef.current) {
      warmRef.current.intensity = (0.18 + env.warmth * 1.15) * revealed * hush;
    }
  });

  return (
    <>
      <hemisphereLight args={["#8eacbf", "#2a1c14", 0.72]} />
      <directionalLight
        ref={moonRef}
        position={[1.6, 5.2, -3.4]}
        color="#c3dff0"
        intensity={1.5}
        castShadow={tier === "high"}
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.0004}
        shadow-camera-near={0.5}
        shadow-camera-far={28}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <pointLight
        ref={warmRef}
        position={[-1.05, 1.15, 0.55]}
        color="#ffb15a"
        intensity={0.35}
        distance={7.5}
        decay={2}
      />
    </>
  );
}

type FrameStats = {
  width: number;
  height: number;
  clientWidth: number;
  clientHeight: number;
  pixelRatio: number;
  minLum: number;
  maxLum: number;
  meanLum: number;
  variance: number;
  paintedFraction: number;
  bboxCoverage: number;
  hash: number;
  renderer: string;
  floorRange: number;
  floorReversals: number;
  shelfRange: number;
  shelfReversals: number;
};

function foregroundFloorSpan(pixels: Uint8Array, width: number, height: number) {
  const row = Math.min(height - 1, Math.max(0, Math.floor(height * 0.75)));
  const glRow = height - 1 - row;
  const x0 = Math.floor(width * 0.02);
  const x1 = Math.max(x0 + 8, Math.floor(width * 0.28));
  const samples: number[] = [];
  for (let x = x0; x < x1; x += 2) {
    const i = (glRow * width + x) * 4;
    samples.push(pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722);
  }
  const count = samples.length;
  if (count < 8) return { range: 0, reversals: 0 };
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumXY = 0;
  for (let i = 0; i < count; i += 1) {
    sumX += i;
    sumY += samples[i];
    sumXX += i * i;
    sumXY += i * samples[i];
  }
  const denom = count * sumXX - sumX * sumX;
  const slope = denom === 0 ? 0 : (count * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / count;
  const residual = samples.map((sample, index) => sample - (intercept + slope * index));
  let min = residual[0];
  let max = residual[0];
  const buckets: number[] = [];
  const bucket = 5;
  for (let i = 0; i + bucket <= residual.length; i += bucket) {
    let bucketSum = 0;
    for (let k = 0; k < bucket; k += 1) bucketSum += residual[i + k];
    buckets.push(bucketSum / bucket);
  }
  for (const value of residual) {
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  let reversals = 0;
  let prev = 0;
  for (let i = 1; i < buckets.length; i += 1) {
    const delta = buckets[i] - buckets[i - 1];
    if (Math.abs(delta) < 1.25) continue;
    const sign = delta > 0 ? 1 : -1;
    if (prev !== 0 && sign !== prev) reversals += 1;
    prev = sign;
  }
  return { range: max - min, reversals };
}

function shelfClothSpan(pixels: Uint8Array, width: number, height: number) {
  let best = { range: 0, reversals: 0 };
  for (const xFrac of [0.07, 0.11, 0.15]) {
    const samples: number[] = [];
    const x = Math.floor(width * xFrac);
    const y0 = Math.floor(height * 0.28);
    const y1 = Math.floor(height * 0.62);
    for (let imageY = y0; imageY < y1; imageY += 3) {
      const glY = height - 1 - imageY;
      const i = (glY * width + x) * 4;
      samples.push(pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722);
    }
    const count = samples.length;
    if (count < 8) continue;
    let sumX = 0;
    let sumY = 0;
    let sumXX = 0;
    let sumXY = 0;
    for (let i = 0; i < count; i += 1) {
      sumX += i;
      sumY += samples[i];
      sumXX += i * i;
      sumXY += i * samples[i];
    }
    const denom = count * sumXX - sumX * sumX;
    const slope = denom === 0 ? 0 : (count * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / count;
    const residual = samples.map((sample, index) => sample - (intercept + slope * index));
    let min = residual[0];
    let max = residual[0];
    for (const value of residual) {
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
    const buckets: number[] = [];
    const bucket = 4;
    for (let i = 0; i + bucket <= residual.length; i += bucket) {
      let bucketSum = 0;
      for (let k = 0; k < bucket; k += 1) bucketSum += residual[i + k];
      buckets.push(bucketSum / bucket);
    }
    let reversals = 0;
    let prev = 0;
    for (let i = 1; i < buckets.length; i += 1) {
      const delta = buckets[i] - buckets[i - 1];
      if (Math.abs(delta) < 1.5) continue;
      const sign = delta > 0 ? 1 : -1;
      if (prev !== 0 && sign !== prev) reversals += 1;
      prev = sign;
    }
    if (reversals > best.reversals) best = { range: max - min, reversals };
  }
  return best;
}

function publishFrameReader(gl: THREE.WebGLRenderer) {
  const host = window as Window & { __pensieveArchive?: { readStats: () => FrameStats } };
  host.__pensieveArchive = {
    readStats() {
      const drawing = gl.getContext();
      const canvas = gl.domElement;
      const width = canvas.width;
      const height = canvas.height;
      const pixels = new Uint8Array(width * height * 4);
      drawing.readPixels(0, 0, width, height, drawing.RGBA, drawing.UNSIGNED_BYTE, pixels);
      const stride = 8;
      let minLum = 255;
      let maxLum = 0;
      let sum = 0;
      let sum2 = 0;
      let n = 0;
      let painted = 0;
      let hash = 2166136261;
      let minX = width;
      let minY = height;
      let maxX = 0;
      let maxY = 0;
      for (let y = 0; y < height; y += stride) {
        for (let x = 0; x < width; x += stride) {
          const i = (y * width + x) * 4;
          const lum = pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722;
          minLum = Math.min(minLum, lum);
          maxLum = Math.max(maxLum, lum);
          sum += lum;
          sum2 += lum * lum;
          n += 1;
          hash ^= pixels[i] + pixels[i + 1] * 3 + pixels[i + 2] * 7;
          hash = Math.imul(hash, 16777619);
          if (lum > 14) {
            painted += 1;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }
      const meanLum = n ? sum / n : 0;
      const variance = n ? Math.max(0, sum2 / n - meanLum * meanLum) : 0;
      const spanX = maxX > minX ? (maxX - minX) / width : 0;
      const spanY = maxY > minY ? (maxY - minY) / height : 0;
      const floor = foregroundFloorSpan(pixels, width, height);
      const shelf = shelfClothSpan(pixels, width, height);
      return {
        width,
        height,
        clientWidth: canvas.clientWidth,
        clientHeight: canvas.clientHeight,
        pixelRatio: gl.getPixelRatio(),
        minLum,
        maxLum,
        meanLum,
        variance,
        paintedFraction: n ? painted / n : 0,
        bboxCoverage: spanX * spanY,
        hash: hash >>> 0,
        renderer: String(drawing.getParameter(drawing.RENDERER) ?? ""),
        floorRange: floor.range,
        floorReversals: floor.reversals,
        shelfRange: shelf.range,
        shelfReversals: shelf.reversals,
      };
    },
  };
}

export function ArchiveCanvas() {
  const qualityTier = useArchiveStore((s) => s.qualityTier);
  const reducedMotion = useArchiveStore((s) => s.reducedMotion);
  const markSceneMounted = useArchiveStore((s) => s.markSceneMounted);
  const hidden = useDocumentHidden();
  const [entryTier] = useState(qualityTier);
  const cap = pixelRatioCap();
  const frameloop = archiveFrameLoop({
    hidden,
    reducedMotion,
    tier: qualityTier,
  });

  return (
    <div
      className="absolute inset-0 h-full w-full overflow-hidden bg-[#070b10]"
      data-archive-scene
      data-quality-tier={qualityTier}
      data-entry-tier={entryTier}
      data-frameloop={frameloop}
      data-pixel-cap={cap}
    >
      <Canvas
        shadows={qualityTier === "high" && !reducedMotion}
        frameloop={frameloop}
        dpr={[1, cap]}
        camera={{ position: [0, 1.6, 6.8], fov: 46 }}
        gl={{
          antialias: false,
          alpha: false,
          stencil: false,
          powerPreference: "high-performance",
          preserveDrawingBuffer: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.18,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor("#070b10", 1);
          gl.debug.checkShaderErrors = true;
          publishFrameReader(gl);
          requestAnimationFrame(() => {
            requestAnimationFrame(() => markSceneMounted());
          });
        }}
      >
        <fogExp2 attach="fog" args={["#0a1016", 0.036]} />
        <CameraRig />
        <ArchiveLights />
        <Stacks />
        <ObservatoryWindow />
        <Moonbeam />
        <Dust />
        <InhabitedAisle />
        <group position={[deskPose.x, 0, deskPose.z]} rotation={[0, deskPose.yaw, 0]}>
          <Desk />
          <WaxSpill />
          <VolumesRack />
          <Candle />
        </group>
        <RetrievalNodes />
        <PageBloom />
      </Canvas>
    </div>
  );
}
