import gsap from "gsap";
import * as THREE from "three";
import { useArchiveStore } from "./store";
import { sceneUniforms } from "./uniforms";
import { basinCenter } from "./basin";
import { globalCameraRef } from "./threads/ThreadLayer";

let timeline: gsap.core.Timeline | null = null;
let owner = 0;
const desk = {
  x: 0.05,
  y: 2.6,
  z: 5.4,
  targetX: 0.28,
  targetY: 0.15,
  targetZ: -0.65,
  fov: 44,
};
const interior = {
  x: 0,
  y: 1.8,
  z: 2.8,
  targetX: 0,
  targetY: 2.05,
  targetZ: -14,
  fov: 48,
};
function stage(
  id: number,
  phase: Parameters<
    ReturnType<typeof useArchiveStore.getState>["setDivePhase"]
  >[1],
) {
  if (owner === id) useArchiveStore.getState().setDivePhase(id, phase);
}
function clear() {
  timeline?.kill();
  timeline = null;
}
function resetUniforms() {
  Object.assign(sceneUniforms.dive, {
    interior: 0,
    veil: 0,
    depression: 0,
    travel: 0,
    roomVisible: true,
    mobileBlend: 1,
    walkTime: 0,
  });
}
function focusReading(id: number) {
  requestAnimationFrame(() => {
    const state = useArchiveStore.getState();
    if (state.requestId !== id || document.hidden || state.phase === "evidence")
      return;
    const element = document.getElementById(
      state.run?.branches.some((b) => b.status === "complete")
        ? "archive-reading-tomes"
        : "archive-research-desk",
    );
    element?.focus({ preventScroll: true });
    if (element?.id === "archive-reading-tomes")
      element.scrollIntoView({
        behavior:
          state.reducedMotion || state.quietReading ? "instant" : "smooth",
        block: "start",
      });
  });
}
export const diveDirector = {
  isAnimating() {
    const state = useArchiveStore.getState();
    return (
      Boolean(timeline?.isActive()) ||
      (state.divePhase === "waiting" && !state.journeyPaused)
    );
  },
  begin(id: number) {
    this.reset();
    owner = id;
    const state = useArchiveStore.getState();
    if (
      state.reducedMotion ||
      state.quietReading ||
      state.lightMode ||
      !state.sceneAvailable ||
      !state.qualityGate.mounted
    )
      return;
    state.markDive();
    stage(id, "offering");
    const camera = globalCameraRef.current;
    const mobile = window.innerWidth < 700;
    if (camera) {
      const direction = camera.getWorldDirection(new THREE.Vector3());
      const target = camera.position.clone().addScaledVector(direction, 6);
      Object.assign(sceneUniforms.camera, {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
        targetX: target.x,
        targetY: target.y,
        targetZ: target.z,
      });
    } else if (mobile) {
      sceneUniforms.camera.x += 0.6;
      sceneUniforms.camera.z += 1.5;
      sceneUniforms.camera.targetX += 0.6;
    }
    sceneUniforms.dive.mobileBlend = 0;
    const scale = state.diveCount ? 0.38 : 1;
    timeline = gsap.timeline();
    const at = (seconds: number) => seconds * scale;
    timeline
      .to(sceneUniforms.thread, { castProgress: 1, duration: at(0.6) }, 0)
      .to(sceneUniforms.environment, { hush: 0.62, duration: at(1.3) }, 0)
      .to(
        sceneUniforms.basin,
        { energy: 1, ripple: 1, duration: at(1.1) },
        at(0.2),
      )
      .to(
        sceneUniforms.dive,
        { depression: 1, duration: at(1.7), ease: "power2.inOut" },
        at(0.4),
      )
      .call(() => stage(id, "approaching"), [], at(0.35))
      .to(
        sceneUniforms.camera,
        {
          x: basinCenter.x,
          y: basinCenter.y + 1.0,
          z: basinCenter.z + 1.45,
          targetX: basinCenter.x,
          targetY: basinCenter.y - 0.12,
          targetZ: basinCenter.z,
          fov: 48,
          duration: at(1.25),
          ease: "power2.inOut",
        },
        at(0.35),
      )
      .call(() => stage(id, "crossing"), [], at(1.6))
      .to(
        sceneUniforms.camera,
        {
          x: basinCenter.x,
          y: basinCenter.y + 0.02,
          z: basinCenter.z + 0.08,
          targetX: basinCenter.x,
          targetY: basinCenter.y - 0.6,
          targetZ: basinCenter.z - 0.24,
          duration: at(1.0),
          ease: "power2.in",
        },
        at(1.6),
      )
      .to(
        sceneUniforms.dive,
        { veil: 1, duration: at(0.65), ease: "power2.inOut" },
        at(1.95),
      )
      .call(
        () => {
          if (useArchiveStore.getState().requestId !== id) return;
          sceneUniforms.dive.roomVisible = false;
          sceneUniforms.dive.interior = 1;
          Object.assign(sceneUniforms.camera, { ...interior, z: 7.5 });
          window.dispatchEvent(new Event("pensieve-crossing"));
          stage(id, "within");
        },
        [],
        at(2.6),
      )
      .to(
        sceneUniforms.dive,
        { veil: 0, travel: 1, duration: at(1.2), ease: "power2.out" },
        at(2.65),
      )
      .to(
        sceneUniforms.camera,
        { ...interior, duration: at(1.8), ease: "power3.out" },
        at(2.6),
      )
      .call(
        () => {
          stage(id, "waiting");
          timeline = null;
        },
        [],
        at(4.4),
      );
  },
  finish(id: number) {
    const state = useArchiveStore.getState();
    if (
      state.requestId !== id ||
      state.divePhase === "idle" ||
      state.divePhase === "arriving"
    )
      return;
    clear();
    stage(id, "arriving");
    window.dispatchEvent(new Event("pensieve-arrival"));
    timeline = gsap.timeline({
      onComplete: () => {
        resetUniforms();
        stage(id, "idle");
        timeline = null;
        focusReading(id);
      },
    });
    // A short dissolve releases the HTML answer while restoring the room underneath it.
    timeline
      .to(sceneUniforms.dive, { veil: 0.68, duration: 0.13 }, 0)
      .call(
        () => {
          if (useArchiveStore.getState().requestId !== id) return;
          sceneUniforms.dive.roomVisible = true;
          sceneUniforms.dive.interior = 0;
          Object.assign(sceneUniforms.camera, desk);
          sceneUniforms.dive.mobileBlend = 1;
        },
        [],
        0.13,
      )
      .to(sceneUniforms.dive, { veil: 0, depression: 0, duration: 0.23 }, 0.13)
      .to(sceneUniforms.environment, { hush: 0, duration: 0.3 }, 0);
  },
  skip() {
    const state = useArchiveStore.getState();
    const id = state.requestId;
    clear();
    resetUniforms();
    Object.assign(sceneUniforms.camera, desk);
    sceneUniforms.environment.hush = 0;
    state.setDivePhase(id, "idle");
    if (state.divePhase !== "idle") focusReading(id);
  },
  suspend() {
    timeline?.pause();
  },
  resume() {
    const state = useArchiveStore.getState();
    if (state.divePhase === "idle") return;
    if (
      !state.isBusy ||
      state.phase === "reading" ||
      state.phase === "evidence"
    ) {
      this.skip();
      return;
    }
    clear();
    if (
      state.reducedMotion ||
      state.quietReading ||
      state.lightMode ||
      !state.sceneAvailable
    ) {
      this.skip();
      return;
    }
    Object.assign(sceneUniforms.dive, {
      interior: 1,
      roomVisible: false,
      veil: 0,
      depression: 1,
      travel: 1,
      mobileBlend: 0,
    });
    Object.assign(sceneUniforms.camera, interior);
    stage(state.requestId, "waiting");
  },
  reset() {
    clear();
    resetUniforms();
    useArchiveStore
      .getState()
      .setDivePhase(useArchiveStore.getState().requestId, "idle");
  },
};
