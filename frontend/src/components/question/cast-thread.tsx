"use client";

import { useEffect, useState } from "react";

export function CastThread() {
  const [geometry, setGeometry] = useState<{
    width: number;
    height: number;
    path: string;
  } | null>(null);
  useEffect(() => {
    function measure() {
      const question = document.getElementById("archive-question");
      const collection = document.getElementById("corpus");
      const form = question?.closest("form");
      if (!question || !collection || !form) return;
      const a = question.getBoundingClientRect();
      const b = collection.getBoundingClientRect();
      const bounds = form.getBoundingClientRect();
      const x1 = a.x - bounds.x + Math.min(80, a.width * 0.15);
      const y1 = a.bottom - bounds.y - 8;
      const x2 = b.x - bounds.x + b.width * 0.5;
      const y2 = b.y - bounds.y + b.height * 0.5;
      setGeometry({
        width: bounds.width,
        height: bounds.height,
        path: `M ${x1} ${y1} C ${x1 + 80} ${y1 + 35}, ${x2 - 65} ${y2 + 35}, ${x2} ${y2}`,
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
  return (
    <svg
      className="cast-thread"
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      aria-hidden="true"
    >
      <path d={geometry.path} pathLength="1" />
    </svg>
  );
}
