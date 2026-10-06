"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function CastThread() {
  const [geometry, setGeometry] = useState<{
    width: number;
    height: number;
    path: string;
  } | null>(null);
  useEffect(() => {
    function measure() {
      const question = document.getElementById("archive-question");
      const volume = document.querySelector<HTMLElement>(
        '.corpus-volume[aria-pressed="true"]',
      );
      const selector = document.getElementById("corpus");
      const target = volume?.getBoundingClientRect().width ? volume : selector;
      if (!question || !target) return;
      const a = question.getBoundingClientRect();
      const b = target.getBoundingClientRect();
      if (!b.width) return;
      const x1 = a.x + Math.min(75, a.width * 0.2);
      const y1 = a.bottom - 15;
      const x2 = b.x + b.width * 0.5;
      const y2 = b.y + b.height * 0.4;
      setGeometry({
        width: window.innerWidth,
        height: window.innerHeight,
        path: `M ${x1} ${y1} C ${x1 - 40} ${y1 + 50}, ${x2 + 85} ${y2 + 35}, ${x2} ${y2}`,
      });
    }
    const frame = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
    };
  }, []);
  if (!geometry) return null;
  return createPortal(
    <svg
      className="cast-thread cast-thread-spatial"
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      aria-hidden="true"
    >
      <path className="cast-ray-halo" d={geometry.path} />
      <path d={geometry.path} pathLength="1" />
    </svg>,
    document.body,
  );
}
