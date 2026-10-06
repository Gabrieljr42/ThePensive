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
        animation: `inkCondense 0.8s ease-out ${delayMs}ms forwards`,
      }}
    >
      {text}
      <style jsx>{`
        @keyframes inkCondense {
          0% {
            opacity: 0.15;
            filter: blur(3.5px);
            color: #7a7082;
          }
          50% {
            opacity: 0.8;
            filter: blur(1.2px);
          }
          100% {
            opacity: 1;
            filter: blur(0);
          }
        }
      `}</style>
    </span>
  );
}
