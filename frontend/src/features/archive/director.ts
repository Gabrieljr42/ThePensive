import gsap from "gsap";
import { sceneUniforms } from "./uniforms";
import { useArchiveStore } from "./store";
import { diveDirector } from "./diveDirector";
import { hasReadableAnswer } from "./model";

let activeTimeline: gsap.core.Timeline | null = null;
let revealedInquiry = -1;
const deskCamera = {
  x: 0.05,
  y: 2.6,
  z: 5.4,
  targetX: 0.28,
  targetY: 0.15,
  targetZ: -0.65,
};
const entryCamera = {
  x: -0.2,
  y: 2.4,
  z: 5.8,
  targetX: 0.1,
  targetY: 0.85,
  targetZ: -0.6,
};

function stop() {
  activeTimeline?.kill();
  activeTimeline = null;
  for (const object of [
    sceneUniforms.camera,
    sceneUniforms.environment,
    sceneUniforms.basin,
    sceneUniforms.thread,
    sceneUniforms.retrieval,
  ])
    gsap.killTweensOf(object);
}
function still() {
  const s = useArchiveStore.getState();
  return s.reducedMotion || s.quietReading || s.lightMode;
}
function focusDesk() {
  requestAnimationFrame(() =>
    document
      .getElementById("archive-research-desk")
      ?.focus({ preventScroll: true }),
  );
}

export const archiveDirector = {
  isAnimating() {
    return (
      Boolean(activeTimeline?.isActive()) ||
      diveDirector.isAnimating() ||
      gsap.isTweening(sceneUniforms.basin) ||
      gsap.isTweening(sceneUniforms.environment) ||
      gsap.isTweening(sceneUniforms.thread)
    );
  },
  enterArchive() {
    stop();
    const s = useArchiveStore.getState();
    if (still()) {
      this.jumpToDesk();
      return;
    }
    s.setPhase("approaching");
    activeTimeline = gsap.timeline({
      onComplete() {
        useArchiveStore.getState().setPhase("desk");
        focusDesk();
      },
    });
    activeTimeline
      .to(
        sceneUniforms.camera,
        { ...deskCamera, duration: 0.85, ease: "power2.inOut" },
        0,
      )
      .to(
        sceneUniforms.environment,
        { darkness: 0, warmth: 0.65, duration: 0.7 },
        0,
      );
  },
  jumpToDesk() {
    diveDirector.reset();
    stop();
    Object.assign(sceneUniforms.camera, deskCamera);
    Object.assign(sceneUniforms.environment, {
      darkness: 0,
      warmth: 0.65,
      hush: 0,
    });
    useArchiveStore.getState().resetToDesk();
    focusDesk();
  },
  resetView(focus = true) {
    diveDirector.reset();
    stop();
    Object.assign(sceneUniforms.camera, entryCamera);
    Object.assign(sceneUniforms.environment, {
      darkness: 0.3,
      warmth: 0.25,
      hush: 0,
    });
    this.resetRitual();
    useArchiveStore.getState().cancelInquiry();
    useArchiveStore.getState().setPhase("threshold");
    if (focus)
      requestAnimationFrame(() =>
        document.getElementById("archive-enter")?.focus(),
      );
  },
  resetRitual() {
    Object.assign(sceneUniforms.basin, {
      energy: 0.12,
      ripple: 0,
      evidence: 0,
    });
    Object.assign(sceneUniforms.thread, {
      castProgress: 0,
      evidenceProgress: 0,
    });
    Object.assign(sceneUniforms.retrieval, {
      active: false,
      pageBloom: 0,
      returnThreadsProgress: 0,
    });
    sceneUniforms.environment.hush = 0;
  },
  castQuestion() {
    stop();
    this.resetRitual();
    if (still()) {
      sceneUniforms.basin.energy = 0.55;
      return;
    }
    activeTimeline = gsap.timeline();
    activeTimeline
      .to(sceneUniforms.thread, { castProgress: 1, duration: 0.45 }, 0)
      .to(
        sceneUniforms.basin,
        { energy: 0.85, ripple: 1, duration: 0.8, ease: "power2.out" },
        0,
      );
  },
  revealRun() {
    const s = useArchiveStore.getState();
    const mode = s.run?.mode ?? s.mode;
    sceneUniforms.retrieval.active = true;
    sceneUniforms.tomes.revealProgress = 1;
    sceneUniforms.tomes.ragGlow = mode === "full_context" ? 0 : 1;
    sceneUniforms.tomes.fullGlow = mode === "rag" ? 0 : 1;
    sceneUniforms.retrieval.pageBloom = mode === "rag" ? 0 : 1;
    if (still()) {
      sceneUniforms.basin.energy = 0.16;
      sceneUniforms.retrieval.returnThreadsProgress = 1;
      return;
    }
    activeTimeline?.kill();
    activeTimeline = gsap.timeline();
    activeTimeline
      .to(
        sceneUniforms.retrieval,
        { returnThreadsProgress: 1, duration: 0.65 },
        0,
      )
      .to(sceneUniforms.basin, { energy: 0.65, duration: 0.25 }, 0)
      .to(
        sceneUniforms.basin,
        { energy: 0.16, duration: 1.1, ease: "power2.out" },
        0.25,
      )
      .to(sceneUniforms.thread, { castProgress: 0, duration: 0.3 }, 0.6);
  },
  stir() {
    const s = useArchiveStore.getState();
    if (s.isBusy) return;
    window.dispatchEvent(new Event("pensieve-stir"));
    gsap.killTweensOf(sceneUniforms.basin);
    sceneUniforms.basin.ripple = 0;
    if (still()) {
      sceneUniforms.basin.ripple = 0.48;
      s.setHoveredVolume(s.hoveredVolumeId);
      return;
    }
    gsap.to(sceneUniforms.basin, {
      ripple: 1,
      energy: 0.4,
      duration: 1,
      ease: "power1.out",
      onComplete: () => {
        gsap.to(sceneUniforms.basin, { energy: 0.16, duration: 0.6 });
      },
    });
    // Wake demand renderers after the uniform mutation.
    s.setHoveredVolume(s.hoveredVolumeId);
  },
  cancelInquiry() {
    diveDirector.skip();
    stop();
    this.resetRitual();
    useArchiveStore.getState().cancelInquiry();
  },
  inspectEvidence(citationId: string) {
    const s = useArchiveStore.getState();
    s.setActiveCitation(citationId);
    s.setPhase("evidence");
    if (still()) {
      sceneUniforms.environment.hush = 0.35;
      sceneUniforms.basin.evidence = 1;
      sceneUniforms.thread.evidenceProgress = 1;
      return;
    }
    gsap.to(sceneUniforms.environment, { hush: 0.35, duration: 0.3 });
    gsap.to(sceneUniforms.basin, { evidence: 1, duration: 0.3 });
    gsap.to(sceneUniforms.thread, { evidenceProgress: 1, duration: 0.35 });
  },
  releaseEvidence() {
    const s = useArchiveStore.getState();
    if (s.pinnedCitationId) return;
    s.setActiveCitation(null);
    s.setActiveEvidence(null);
    s.setPhase(s.run ? "reading" : "desk");
    if (still()) {
      sceneUniforms.environment.hush = 0;
      sceneUniforms.basin.evidence = 0;
      sceneUniforms.thread.evidenceProgress = 0;
      return;
    }
    gsap.to(sceneUniforms.environment, { hush: 0, duration: 0.25 });
    gsap.to(sceneUniforms.basin, { evidence: 0, duration: 0.25 });
    gsap.to(sceneUniforms.thread, { evidenceProgress: 0, duration: 0.25 });
  },
  settleMotion() {
    if (useArchiveStore.getState().divePhase !== "idle") diveDirector.skip();
    stop();
    const s = useArchiveStore.getState();
    Object.assign(
      sceneUniforms.camera,
      ["dark", "threshold"].includes(s.phase) ? entryCamera : deskCamera,
    );
    if (s.phase === "approaching") {
      s.setPhase("desk");
      focusDesk();
    }
    sceneUniforms.basin.energy = 0.16;
    sceneUniforms.basin.ripple = 0;
  },
  dispose() {
    diveDirector.reset();
    stop();
  },
  beginDive(id: number) {
    stop();
    diveDirector.begin(id);
  },
  receiveInquiry(id: number) {
    const state = useArchiveStore.getState();
    if (state.requestId !== id) return;
    if (hasReadableAnswer(state.run) || !state.isBusy) {
      diveDirector.finish(id);
      if (hasReadableAnswer(state.run) && revealedInquiry !== id) {
        revealedInquiry = id;
        this.revealRun();
      }
    }
  },
  finishDive(id: number) {
    diveDirector.finish(id);
  },
  skipDive() {
    diveDirector.skip();
  },
  suspendDive() {
    diveDirector.suspend();
  },
  resumeDive() {
    diveDirector.resume();
  },
};
