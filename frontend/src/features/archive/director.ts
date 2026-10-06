import gsap from "gsap";
import { sceneUniforms } from "./uniforms";
import { useArchiveStore } from "./store";

let activeMasterTimeline: gsap.core.Timeline | null = null;

export const archiveDirector = {
  enterArchive(onComplete?: () => void) {
    const store = useArchiveStore.getState();
    if (store.reducedMotion) {
      sceneUniforms.environment.darkness = 0;
      sceneUniforms.environment.warmth = 0.85;
      sceneUniforms.camera.x = 0;
      sceneUniforms.camera.y = 1.05;
      sceneUniforms.camera.z = 1.65;
      sceneUniforms.camera.targetY = 0.55;
      sceneUniforms.camera.targetZ = 0.2;
      store.setPhase("desk");
      onComplete?.();
      return;
    }

    if (activeMasterTimeline) activeMasterTimeline.kill();

    store.setPhase("approaching");
    const tl = gsap.timeline({
      onComplete: () => {
        store.setPhase("desk");
        onComplete?.();
      },
    });
    activeMasterTimeline = tl;

    tl.to(sceneUniforms.environment, {
      darkness: 0,
      duration: 1.2,
      ease: "power2.out",
    }, 0);

    tl.to(sceneUniforms.environment, {
      warmth: 0.85,
      duration: 2.2,
      ease: "power2.inOut",
    }, 0.2);

    tl.to(sceneUniforms.camera, {
      x: 0,
      y: 1.05,
      z: 1.65,
      targetX: 0,
      targetY: 0.55,
      targetZ: 0.2,
      duration: 2.2,
      ease: "power3.inOut",
    }, 0);
  },

  castQuestion(onRetrieveComplete?: () => void) {
    const store = useArchiveStore.getState();
    if (store.reducedMotion) {
      sceneUniforms.thread.castProgress = 1;
      sceneUniforms.tomes.revealProgress = 1;
      sceneUniforms.tomes.ragGlow = 1;
      sceneUniforms.tomes.fullGlow = 1;
      store.setPhase("reading");
      store.setIsBusy(false);
      onRetrieveComplete?.();
      return;
    }

    if (activeMasterTimeline) activeMasterTimeline.kill();

    store.setPhase("casting");
    store.setIsBusy(true);

    const tl = gsap.timeline({
      onComplete: () => {
        store.setPhase("reading");
        store.setIsBusy(false);
        onRetrieveComplete?.();
      },
    });
    activeMasterTimeline = tl;

    // 1. Thread travels from seal to book
    sceneUniforms.thread.castProgress = 0;
    tl.to(sceneUniforms.thread, {
      castProgress: 1,
      duration: 0.2,
      ease: "power2.inOut",
    }, 0);

    // 2. Retrieval ceremony setup
    tl.add(() => {
      store.setPhase("retrieving");
      sceneUniforms.retrieval.active = true;
      sceneUniforms.retrieval.returnThreadsProgress = 0;
      for (let i = 0; i < 8; i++) {
        sceneUniforms.retrieval.candidateAwakening[i] = 0;
        sceneUniforms.retrieval.candidateRerank[i] = 1;
      }
    }, 0.15);

    // Camera elevates to reveal background stacks
    tl.to(sceneUniforms.camera, {
      y: 1.35,
      z: 2.4,
      targetY: 0.75,
      duration: 0.25,
      ease: "power2.out",
    }, 0.15);

    // Awaken 8 candidate nodes sequentially
    for (let i = 0; i < 8; i++) {
      tl.to(
        sceneUniforms.retrieval.candidateAwakening,
        {
          [i]: 1,
          duration: 0.12,
          ease: "power1.out",
        },
        0.2 + i * 0.02,
      );
    }

    // Page bloom if Full Context or Compare
    if (store.mode === "full_context" || store.mode === "compare") {
      tl.to(
        sceneUniforms.retrieval,
        {
          pageBloom: 1,
          duration: 0.25,
          ease: "power2.out",
        },
        0.25,
      );
    }

    // Rerank phase: fade out 5 non-selected candidates
    const discardedIndices = [3, 4, 5, 6, 7];
    discardedIndices.forEach((idx) => {
      tl.to(
        sceneUniforms.retrieval.candidateRerank,
        {
          [idx]: 0.12,
          duration: 0.15,
          ease: "power2.inOut",
        },
        0.42,
      );
    });

    // Return threads from surviving nodes
    tl.to(
      sceneUniforms.retrieval,
      {
        returnThreadsProgress: 1,
        duration: 0.2,
        ease: "power2.inOut",
      },
      0.52,
    );

    // Camera returns down to the reading desk
    tl.to(
      sceneUniforms.camera,
      {
        y: 1.05,
        z: 1.65,
        targetY: 0.55,
        duration: 0.25,
        ease: "power3.inOut",
      },
      0.62,
    );

    // Twin Tomes reveal
    tl.to(
      sceneUniforms.tomes,
      {
        revealProgress: 1,
        ragGlow: 1,
        fullGlow: 1,
        duration: 0.2,
        ease: "power2.out",
      },
      0.72,
    );
  },

  inspectEvidence(citationId: string) {
    const store = useArchiveStore.getState();
    store.setActiveCitation(citationId);
    store.setPhase("evidence");

    if (store.reducedMotion) {
      sceneUniforms.environment.hush = 0.75;
      sceneUniforms.thread.evidenceProgress = 1;
      return;
    }

    gsap.to(sceneUniforms.environment, {
      hush: 0.75,
      duration: 0.35,
      ease: "power2.out",
    });

    sceneUniforms.thread.evidenceProgress = 0;
    gsap.to(sceneUniforms.thread, {
      evidenceProgress: 1,
      duration: 0.45,
      ease: "power2.out",
    });
  },

  releaseEvidence() {
    const store = useArchiveStore.getState();
    if (store.pinnedCitationId) return; // Keep if pinned

    store.setActiveCitation(null);
    store.setPhase("reading");

    if (store.reducedMotion) {
      sceneUniforms.environment.hush = 0;
      sceneUniforms.thread.evidenceProgress = 0;
      return;
    }

    gsap.to(sceneUniforms.environment, {
      hush: 0,
      duration: 0.3,
      ease: "power2.out",
    });

    gsap.to(sceneUniforms.thread, {
      evidenceProgress: 0,
      duration: 0.25,
      ease: "power2.in",
    });
  },

  jumpToDesk() {
    const store = useArchiveStore.getState();
    sceneUniforms.environment.darkness = 0;
    sceneUniforms.environment.warmth = 0.85;
    sceneUniforms.camera.x = 0;
    sceneUniforms.camera.y = 1.05;
    sceneUniforms.camera.z = 1.65;
    sceneUniforms.camera.targetY = 0.55;
    store.setPhase("desk");
  },
};
