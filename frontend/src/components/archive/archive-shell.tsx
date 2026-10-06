"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MotionConfig } from "motion/react";
import { ArchiveMark, Icon } from "../icon";
import type { Mode } from "@/lib/contracts";
import { ArchiveEnvironment, type ScenePhase } from "./archive-environment";

export function ArchiveShell({
  children,
  quiet = true,
  onQuietChange,
  mode = "compare",
  phase = "idle",
}: {
  children: React.ReactNode;
  quiet?: boolean;
  onQuietChange?: () => void;
  mode?: Mode;
  phase?: ScenePhase;
}) {
  const pathname = usePathname();
  return (
    <MotionConfig reducedMotion="user">
      <div
        className={`archive-world immersive-world ${quiet ? "quiet-reading" : ""}`}
        data-lighting={mode}
        data-phase={phase}
      >
        <a className="skip-link" href="#main">
          Skip to the reading room
        </a>
        <ArchiveEnvironment quiet={quiet} mode={mode} phase={phase} />
        <header className="archive-header">
          <Link
            className="wordmark"
            href="/"
            aria-label="Pensieve, the Midnight Archive"
          >
            <ArchiveMark />
            <span>
              Pensieve<small>THE MIDNIGHT ARCHIVE</small>
            </span>
          </Link>
          <nav aria-label="Main navigation">
            <Link
              href="/ask"
              aria-current={pathname === "/ask" ? "page" : undefined}
            >
              Reading room
            </Link>
            <Link
              href="/architecture"
              aria-current={pathname === "/architecture" ? "page" : undefined}
            >
              How it works
            </Link>
          </nav>
          {onQuietChange && (
            <button
              className="quiet-control"
              onClick={onQuietChange}
              aria-pressed={quiet}
              aria-label="Quiet reading"
            >
              <Icon name="moon" />
              <span>Quiet reading</span>
            </button>
          )}
        </header>
        {children}
        <footer className="archive-footer">
          <span>
            <Icon name="spark" /> Magic reveals relationships.
          </span>
          <span>
            Pensieve <span aria-hidden="true">·</span> An experiment in reading
            with evidence
          </span>
          <Link href="/architecture">
            Inside the archive <Icon name="arrow" />
          </Link>
        </footer>
      </div>
    </MotionConfig>
  );
}
