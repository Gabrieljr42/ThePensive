"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type { Mode } from "@/lib/contracts";

export type ScenePhase = "idle" | "searching" | "evidence" | "error";

export function ArchiveEnvironment({
  quiet = false,
  mode = "compare",
  phase = "idle",
  entrance = false,
  approaching = false,
}: {
  quiet?: boolean;
  mode?: Mode;
  phase?: ScenePhase;
  entrance?: boolean;
  approaching?: boolean;
}) {
  const room = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = room.current;
    if (!element) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let x = 0;
    let y = 0;
    function paint() {
      frame = 0;
      if (!element) return;
      const still = quiet || approaching || preference.matches;
      element.style.setProperty("--scene-x", `${still ? 0 : x * 8}px`);
      element.style.setProperty("--scene-y", `${still ? 0 : y * 5}px`);
      element.style.setProperty(
        "--scene-depth",
        `${still ? 0 : Math.min(window.scrollY / 1200, 1)}`,
      );
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(paint);
    }
    function visibility() {
      element?.toggleAttribute("data-suspended", document.hidden);
    }
    function pointer(event: PointerEvent) {
      if (event.pointerType !== "mouse") return;
      x = event.clientX / window.innerWidth - 0.5;
      y = event.clientY / window.innerHeight - 0.5;
      schedule();
    }
    window.addEventListener("pointermove", pointer, { passive: true });
    window.addEventListener("scroll", schedule, { passive: true });
    preference.addEventListener("change", schedule);
    document.addEventListener("visibilitychange", visibility);
    visibility();
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", pointer);
      window.removeEventListener("scroll", schedule);
      preference.removeEventListener("change", schedule);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [quiet, approaching]);
  return (
    <div
      ref={room}
      className={`archive-environment immersive-environment ${entrance ? "environment-entrance" : "environment-room"} ${quiet ? "environment-quiet" : ""}`}
      data-lighting={mode}
      data-phase={phase}
      data-approaching={approaching}
      aria-hidden="true"
    >
      <div className="environment-architecture">
        <Image
          src="/art/midnight-archive.png"
          alt=""
          fill
          preload
          sizes="100vw"
          quality={85}
        />
      </div>
      <div className="environment-distance" />
      <div className="environment-moonlight" />
      <div className="environment-emberlight" />
      <div className="environment-mist" />
      <div className="environment-desk">
        <Image
          src="/art/archive-desk.webp"
          alt=""
          fill
          sizes="(max-width: 760px) 180vw, 120vw"
          quality={85}
          loading="eager"
        />
      </div>
      <div className="environment-vignette" />
      <div className="room-motes">
        {Array.from({ length: 15 }, (_, index) => (
          <i key={index} style={{ "--mote": index } as React.CSSProperties} />
        ))}
      </div>
    </div>
  );
}
