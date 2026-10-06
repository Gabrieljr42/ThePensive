"use client";

import { useEffect, useState } from "react";
import type { EvidenceSelection } from "@/lib/contracts";

export function EvidenceThread({
  selection,
}: {
  selection: EvidenceSelection | null;
}) {
  const [geometry, setGeometry] = useState<{
    path: string;
    citationId: string;
    width: number;
    height: number;
  } | null>(null);
  useEffect(() => {
    if (!selection) return;
    function measure() {
      const from = document.querySelector(
        `[data-citation-id="${CSS.escape(selection!.citation.id)}"]`,
      );
      const to = document.querySelector(
        `[data-source-id="${CSS.escape(selection!.source.id)}"]`,
      );
      if (!from || !to) return;
      const a = from.getBoundingClientRect();
      const b = to.getBoundingClientRect();
      if (!a.width || !b.width) return;
      const x1 = a.x + a.width / 2;
      const y1 = a.y + a.height;
      const x2 = b.x + b.width / 2;
      const y2 = b.y;
      const bend = Math.max(35, (y2 - y1) * 0.42);
      setGeometry({
        citationId: selection!.citation.id,
        path: `M ${x1} ${y1} C ${x1} ${y1 + bend}, ${x2} ${y2 - bend}, ${x2} ${y2}`,
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    const room = document.querySelector(".reading-room");
    if (room) observer.observe(room);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [selection]);
  if (!selection || !geometry || geometry.citationId !== selection.citation.id)
    return null;
  const color = selection.branch.method === "rag" ? "#b69150" : "#779fa8";
  return (
    <svg
      className="evidence-thread"
      width={geometry.width}
      height={geometry.height}
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      aria-hidden="true"
      key={selection.citation.id}
    >
      <path className="thread-halo" d={geometry.path} stroke={color} />
      <path
        className="thread-line"
        d={geometry.path}
        stroke={color}
        pathLength="1"
      />
    </svg>
  );
}
