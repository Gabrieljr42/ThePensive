"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { sceneUniforms } from "../uniforms";
import { globalCameraRef } from "../threads/ThreadLayer";
import { useArchiveStore } from "../store";

export function CameraRig() {
  const { camera, size } = useThree();
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const lookTarget = useRef(
    new THREE.Vector3(
      sceneUniforms.camera.targetX,
      sceneUniforms.camera.targetY,
      sceneUniforms.camera.targetZ,
    ),
  );
  const currentPos = useRef(
    new THREE.Vector3(
      sceneUniforms.camera.x,
      sceneUniforms.camera.y,
      sceneUniforms.camera.z,
    ),
  );
  const reducedMotion = useArchiveStore((s) => s.reducedMotion);
  const tier = useArchiveStore((s) => s.qualityTier);

  useEffect(() => {
    globalCameraRef.current = camera;

    const handleMouseMove = (e: MouseEvent) => {
      if (
        reducedMotion ||
        e.buttons ||
        window.matchMedia("(pointer: coarse)").matches ||
        useArchiveStore.getState().quietReading ||
        useArchiveStore.getState().lightMode
      )
        return;
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseRef.current.targetX = x * 0.065;
      mouseRef.current.targetY = y * 0.035;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [camera, reducedMotion]);

  useFrame((_, delta) => {
    const state = useArchiveStore.getState();
    const mobile = size.width < 700;
    const shiftX = mobile ? 0.6 : 0;
    const shiftZ = mobile ? 1.5 : 0;
    if (
      reducedMotion ||
      tier === "low" ||
      state.lightMode ||
      state.quietReading
    ) {
      camera.position.set(
        sceneUniforms.camera.x + shiftX,
        sceneUniforms.camera.y,
        sceneUniforms.camera.z + shiftZ,
      );
      camera.lookAt(
        sceneUniforms.camera.targetX + shiftX,
        sceneUniforms.camera.targetY,
        sceneUniforms.camera.targetZ,
      );
      return;
    }

    const m = mouseRef.current;
    m.x += (m.targetX - m.x) * Math.min(delta * 4, 1);
    m.y += (m.targetY - m.y) * Math.min(delta * 4, 1);

    // Target positions from uniforms + parallax offset
    const targetCamX = sceneUniforms.camera.x + m.x + shiftX;
    const targetCamY = sceneUniforms.camera.y + m.y;
    const targetCamZ = sceneUniforms.camera.z + shiftZ;

    const targetLookX = sceneUniforms.camera.targetX + m.x * 0.4 + shiftX;
    const targetLookY = sceneUniforms.camera.targetY + m.y * 0.4;
    const targetLookZ = sceneUniforms.camera.targetZ;

    const lerpSpeed = Math.min(delta * 6, 1);
    currentPos.current.x += (targetCamX - currentPos.current.x) * lerpSpeed;
    currentPos.current.y += (targetCamY - currentPos.current.y) * lerpSpeed;
    currentPos.current.z += (targetCamZ - currentPos.current.z) * lerpSpeed;

    lookTarget.current.x += (targetLookX - lookTarget.current.x) * lerpSpeed;
    lookTarget.current.y += (targetLookY - lookTarget.current.y) * lerpSpeed;
    lookTarget.current.z += (targetLookZ - lookTarget.current.z) * lerpSpeed;

    camera.position.copy(currentPos.current);
    camera.lookAt(lookTarget.current);
  });

  return null;
}
