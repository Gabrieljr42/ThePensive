"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { sceneUniforms } from "../uniforms";
import { globalCameraRef } from "../threads/ThreadLayer";
import { useArchiveStore } from "../store";
import { memoryWalkPose } from "../memoryWalk";

function updateCameraLens(camera: THREE.Camera, fov: number) {
  if (
    camera instanceof THREE.PerspectiveCamera &&
    Math.abs(camera.fov - fov) > 0.01
  ) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
}

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
  const wasDiving = useRef(false);

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
    const diving = state.divePhase !== "idle";
    const mobile = size.width < 700;
    if (state.divePhase === "waiting") {
      if (
        !state.journeyPaused &&
        !state.reducedMotion &&
        !state.quietReading &&
        !state.lightMode
      )
        sceneUniforms.dive.walkTime += Math.min(delta, 0.05);
      const pose = memoryWalkPose(sceneUniforms.dive.walkTime);
      camera.position.set(pose.x, pose.y, pose.z);
      camera.lookAt(pose.targetX, pose.targetY, pose.targetZ);
      currentPos.current.copy(camera.position);
      lookTarget.current.set(pose.targetX, pose.targetY, pose.targetZ);
      return;
    }
    const shiftX = mobile ? 0.6 * sceneUniforms.dive.mobileBlend : 0;
    const shiftZ = mobile ? 1.5 * sceneUniforms.dive.mobileBlend : 0;
    if (wasDiving.current && !diving) {
      currentPos.current.set(
        sceneUniforms.camera.x + shiftX,
        sceneUniforms.camera.y,
        sceneUniforms.camera.z + shiftZ,
      );
      lookTarget.current.set(
        sceneUniforms.camera.targetX + shiftX,
        sceneUniforms.camera.targetY,
        sceneUniforms.camera.targetZ,
      );
    }
    wasDiving.current = diving;
    updateCameraLens(camera, sceneUniforms.camera.fov);
    if (
      diving ||
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
      currentPos.current.copy(camera.position);
      lookTarget.current.set(
        sceneUniforms.camera.targetX + shiftX,
        sceneUniforms.camera.targetY,
        sceneUniforms.camera.targetZ,
      );
      mouseRef.current = { x: 0, y: 0, targetX: 0, targetY: 0 };
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
