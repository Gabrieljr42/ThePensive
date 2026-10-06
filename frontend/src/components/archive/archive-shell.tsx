"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MotionConfig } from "motion/react";
import { ArchiveMark, Icon } from "../icon";

export function ArchiveShell({
  children,
  quiet = true,
  onQuietChange,
}: {
  children: React.ReactNode;
  quiet?: boolean;
  onQuietChange?: () => void;
}) {
  const pathname = usePathname();
  return (
    <MotionConfig reducedMotion="user">
      <div className={`archive-world ${quiet ? "quiet-reading" : ""}`}>
        <a className="skip-link" href="#main">
          Skip to the reading room
        </a>
        <div className="archive-environment" aria-hidden="true">
          <Image
            src="/art/midnight-archive.png"
            alt=""
            fill
            preload
            sizes="100vw"
            quality={85}
          />
          <div className="scene-shade" />
        </div>
        <div className="archive-dust" aria-hidden="true">
          {Array.from({ length: 9 }, (_, i) => (
            <i key={i} style={{ "--dust-index": i } as React.CSSProperties} />
          ))}
        </div>
        <header className="archive-header">
          <Link
            className="wordmark"
            href="/ask"
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
