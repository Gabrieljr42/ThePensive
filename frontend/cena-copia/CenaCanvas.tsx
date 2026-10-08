"use client";

import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CameraRig } from "@/features/archive/scene/CameraRig";
import { ObservatoryWindow } from "@/features/archive/scene/ObservatoryWindow";
import { Moonbeam } from "@/features/archive/scene/Moonbeam";
import { Dust } from "@/features/archive/scene/Dust";
import { Candle } from "@/features/archive/scene/Candle";
import { RetrievalNodes } from "@/features/archive/scene/RetrievalNodes";
import { PageBloom } from "@/features/archive/scene/PageBloom";
import { DeskInstruments } from "@/features/archive/scene/DeskInstruments";
import { ArchiveEnvironment } from "@/features/archive/scene/ArchiveEnvironment";
import { SceneRuntime } from "@/features/archive/scene/SceneRuntime";
import { MemoryInterior } from "@/features/archive/scene/MemoryInterior";
import { MemoryPass } from "@/features/archive/scene/MemoryPass";
import { useArchiveStore } from "@/features/archive/store";
import { sceneUniforms } from "@/features/archive/uniforms";
import { archiveFrameLoop, pixelRatioCap } from "@/features/archive/archiveBudget";
import { deskPose } from "@/features/archive/scene/sceneLayout";
import { Stacks } from "./Stacks";
import { Desk } from "./Desk";
import { VolumesRack } from "./VolumesRack";
import { PensieveBasin } from "./PensieveBasin";

const threeWithConsole = THREE as unknown as {
  setConsoleFunction?: (
    fn: (type: string, message: unknown, ...params: unknown[]) => void,
  ) => void;
};
if (typeof threeWithConsole.setConsoleFunction === "function") {
  threeWithConsole.setConsoleFunction((type, message, ...params) => {
    if (
      type === "warn" &&
      typeof message === "string" &&
      message.includes("THREE.Clock: This module has been deprecated")
    ) {
      return;
    }
    const target = console[type as keyof Console];
    if (typeof target === "function") {
      (target as (...args: unknown[]) => void)(message, ...params);
    }
  });
}

function ArchiveWorld({ children }: { children: ReactNode }) {
  const root = useRef<THREE.Group>(null);
  useFrame(() => {
    if (root.current) root.current.visible = sceneUniforms.dive.roomVisible;
  });
  return (
    <group ref={root} name="ArchiveWorld">
      {children}
    </group>
  );
}

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
      const cool = 2.1 + (1 - env.warmth) * 0.35;
      moonRef.current.intensity = cool * revealed * hush;
      moonRef.current.color.set(env.warmth > 0.55 ? "#d5e2ea" : "#c3dff0");
    }
    if (warmRef.current) {
      warmRef.current.intensity = (1.1 + env.warmth * 0.8) * revealed * hush;
    }
  });

  return (
    <>
      <hemisphereLight args={["#94a9b9", "#594334", 1.25]} />
      <directionalLight
        ref={moonRef}
        position={[-2.5, 5.2, 1.8]}
        color="#c3dff0"
        intensity={2.3}
        castShadow={tier === "high"}
        shadow-mapSize={[1024, 1024]}
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
        position={[-1.7, 2.6, 1.5]}
        color="#e6ac68"
        intensity={1.9}
        distance={9}
        decay={2}
      />
    </>
  );
}

export function CenaCanvas() {
  const qualityTier = useArchiveStore((s) => s.qualityTier);
  const reducedMotion = useArchiveStore((s) => s.reducedMotion);
  const quietReading = useArchiveStore((s) => s.quietReading);
  const lightMode = useArchiveStore((s) => s.lightMode);
  const journeyPaused = useArchiveStore((s) => s.journeyPaused);
  const hidden = useDocumentHidden();
  const cap = pixelRatioCap();
  const frameloop = archiveFrameLoop({
    hidden,
    reducedMotion: reducedMotion || quietReading || journeyPaused,
    tier: lightMode ? "low" : qualityTier,
  });

  return (
    <div className="fixed inset-0 h-dvh w-full overflow-hidden bg-[#0b1018]">
      <Canvas
        shadows={
          qualityTier === "high" && !reducedMotion && !lightMode
            ? "percentage"
            : false
        }
        frameloop={frameloop}
        dpr={[1, cap]}
        camera={{ position: [0.1, 2.05, 6.9], fov: 44 }}
        gl={{
          antialias: true,
          alpha: false,
          stencil: false,
          powerPreference: "high-performance",
          preserveDrawingBuffer: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.12,
        }}
        onCreated={({ gl }) => {
          gl.shadowMap.type = THREE.PCFShadowMap;
          gl.setClearColor("#0b1018", 1);
          gl.debug.checkShaderErrors = true;
        }}
      >
        <Suspense fallback={null}>
          <fogExp2 attach="fog" args={["#151c25", 0.028]} />
          <ArchiveEnvironment />
          <SceneRuntime />
          <CameraRig />
          <MemoryPass />
          <MemoryInterior />
          <ArchiveWorld>
            <ArchiveLights />
            <Stacks />
            <ObservatoryWindow />
            <Moonbeam />
            <Dust />
            <PensieveBasin />
            <group
              position={[deskPose.x, 0, deskPose.z]}
              rotation={[0, deskPose.yaw, 0]}
            >
              <Desk />
              <VolumesRack />
              <Candle />
              <DeskInstruments />
            </group>
            <RetrievalNodes />
            <PageBloom />
          </ArchiveWorld>
        </Suspense>
      </Canvas>
    </div>
  );
}
