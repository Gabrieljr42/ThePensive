"use client";

import { useEffect, useState } from "react";

export type SourceOrigin = { x: number; y: number };

export function SourceConnection({
  origin,
  citationId,
  cool,
}: {
  origin: SourceOrigin | null;
  citationId: string;
  cool: boolean;
}) {
  const [geometry, setGeometry] = useState<{
    width: number;
    height: number;
    path: string;
    arrival: string;
  } | null>(null);
  useEffect(() => {
    function measure() {
      const claim = document.querySelector("dialog[open] .claim-link");
      const passage = document.querySelector("dialog[open] .excerpt-leaf mark");
      if (!claim || !passage) return;
      const a = claim.getBoundingClientRect();
      const b = passage.getBoundingClientRect();
      const x1 = a.right + 3;
      const y1 = a.y + a.height * 0.5;
      const x2 = b.x - 4;
      const y2 = b.y + b.height * 0.5;
      const horizontal = Math.abs(x2 - x1) > 70;
      const path = horizontal
        ? `M ${x1} ${y1} C ${x1 + 80} ${y1}, ${x2 - 80} ${y2}, ${x2} ${y2}`
        : `M ${a.x + a.width * 0.5} ${a.bottom} C ${a.x + a.width * 0.5} ${a.bottom + 35}, ${b.x + b.width * 0.5} ${b.y - 35}, ${b.x + b.width * 0.5} ${b.y}`;
      const arrival = origin
        ? `M ${origin.x} ${origin.y} Q ${origin.x - 45} ${y1 - 80}, ${a.x} ${y1}`
        : "";
      setGeometry({
        width: window.innerWidth,
        height: window.innerHeight,
        path,
        arrival,
      });
    }
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    const content = document.querySelector("dialog[open] .drawer-scroll");
    if (content) observer.observe(content);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [origin, citationId]);
  if (!geometry) return null;
  return (
    <svg
      className={`source-connection ${cool ? "connection-moonlight" : ""}`}
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      aria-hidden="true"
    >
      <path className="source-arrival" d={geometry.arrival} pathLength="1" />
      <path className="source-ray-halo" d={geometry.path} />
      <path className="source-ray" d={geometry.path} pathLength="1" />
    </svg>
  );
}
