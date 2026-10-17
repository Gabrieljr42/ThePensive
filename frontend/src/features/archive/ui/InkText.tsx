"use client";

import { useArchiveStore } from "../store";

interface InkTextProps {
  text: string;
  className?: string;
  delayMs?: number;
}

export function InkText({ text, className = "", delayMs = 0 }: InkTextProps) {
  const reducedMotion = useArchiveStore((s) => s.reducedMotion);

  if (reducedMotion) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span
      className={`inline transition-all duration-700 ease-out ${className}`}
      style={{
        animation: `inkCondense 0.25s ease-out ${Math.min(delayMs, 150)}ms both`,
      }}
    >
      {text}
      <style jsx>{`
        @keyframes inkCondense {
          0% {
            opacity: 0.7;
          }
          50% {
            opacity: 0.8;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
    </span>
  );
}
