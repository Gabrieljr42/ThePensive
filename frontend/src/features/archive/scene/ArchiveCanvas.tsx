"use client";

import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
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

export function ArchiveCanvas() {
  const qualityTier = useArchiveStore((s) => s.qualityTier);
  const reducedMotion = useArchiveStore((s) => s.reducedMotion);

  return (
    <div className="absolute inset-0 h-full w-full overflow-hidden bg-[#05070a]">
      <Canvas
        shadows
        camera={{ position: [0, 1.8, 7.2], fov: 46 }}
        dpr={qualityTier === "high" ? [1, 2] : [1, 1.25]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
      >
        {/* Atmospheric Exponential Fog */}
        <fogExp2 attach="fog" args={["#05080c", 0.075]} />

        {/* Camera and Parallax Rig */}
        <CameraRig />

        {/* Cold Nocturnal Ambient Light */}
        <hemisphereLight
          args={["#142436", "#04070a", 0.42]}
        />

        {/* Directional Moonlight streaming through high observatory window */}
        <directionalLight
          position={[1.5, 5.0, -3.2]}
          color="#9ec6db"
          intensity={1.2}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.001}
        />

        {/* Grand Architecture & Towering Stacks */}
        <Stacks />

        {/* Observatory Window with Moon & Night Clouds */}
        <ObservatoryWindow />

        {/* Volumetric Moonbeam cutting across the aisle */}
        <Moonbeam />

        {/* Illumination-responsive Floating Dust Motes */}
        <Dust />

        {/* Research Desk with Tabletop and Volume Rack */}
        <Desk />

        {/* The 7 Interactive Volumes */}
        <VolumesRack />

        {/* Candle with Flame Shader & Flickering Point Light */}
        <Candle />

        {/* 8 Distant Shelf Candidate Nodes for RAG Retrieval */}
        <RetrievalNodes />

        {/* Full Context Page Bloom Accordion */}
        <PageBloom />

        {/* Post-processing (Bloom & Lens Vignette) for High/Mid tiers */}
        {!reducedMotion && qualityTier !== "low" && (
          <EffectComposer multisampling={0}>
            <Bloom
              luminanceThreshold={0.65}
              luminanceSmoothing={0.3}
              intensity={0.65}
            />
            <Vignette eskil={false} offset={0.15} darkness={0.85} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
