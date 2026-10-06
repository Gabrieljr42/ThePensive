import type { SVGProps } from "react";

type IconName =
  | "book"
  | "moon"
  | "spark"
  | "arrow"
  | "compare"
  | "leaf"
  | "check"
  | "close"
  | "chevron"
  | "clock"
  | "stop";
const paths: Record<IconName, React.ReactNode> = {
  book: (
    <>
      <path d="M12 6C9 3.8 5.5 3.8 3 5v14c2.5-1.2 6-1.2 9 1 3-2.2 6.5-2.2 9-1V5c-2.5-1.2-6-1.2-9 1Z" />
      <path d="M12 6v14M6 8l3 .5M15 8.5l3-.5" />
    </>
  ),
  moon: <path d="M20.6 14.2A8.6 8.6 0 0 1 9.8 3.4 8.7 8.7 0 1 0 20.6 14.2Z" />,
  spark: (
    <>
      <path d="m12 3 2.1 6.9L21 12l-6.9 2.1L12 21l-2.1-6.9L3 12l6.9-2.1L12 3Z" />
      <path d="m20 2 .5 1.5L22 4l-1.5.5L20 6l-.5-1.5L18 4l1.5-.5L20 2Z" />
    </>
  ),
  arrow: (
    <>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </>
  ),
  compare: (
    <>
      <path d="M3 6h7v13H3zM14 6h7v13h-7zM12 3v18" />
    </>
  ),
  leaf: (
    <>
      <path d="M6 3h9l4 4v14H6V3Z" />
      <path d="M14 3v5h5M9 12h7M9 16h5" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  chevron: <path d="m7 10 5 5 5-5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  stop: <rect x="6" y="6" width="12" height="12" rx="1" />,
};

export function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}

export function ArchiveMark() {
  return (
    <svg
      className="archive-mark"
      width="40"
      height="40"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 24c1 10 7 15 17 15s16-5 17-15H7Z"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M10 24c8-4 20-4 28 0M14 30c6 3 14 3 20 0M19 39h10M24 21V8M20 12l4-5 4 5M14 17l-3-4M34 17l3-4"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <circle cx="24" cy="4" r="1.4" fill="currentColor" />
      <path d="M5 21h38" stroke="currentColor" strokeWidth=".7" />
    </svg>
  );
}
