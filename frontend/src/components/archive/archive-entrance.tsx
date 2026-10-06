"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MotionConfig, useReducedMotion } from "motion/react";
import { ArchiveEnvironment } from "./archive-environment";
import { ArchiveMark, Icon } from "../icon";

export function ArchiveEntrance() {
  const [approaching, setApproaching] = useState(false);
  const reduced = useReducedMotion();
  const router = useRouter();
  const transition = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (transition.current) clearTimeout(transition.current);
    },
    [],
  );
  return (
    <MotionConfig reducedMotion="user">
      <div className="entrance-world" data-approaching={approaching}>
        <ArchiveEnvironment
          entrance
          approaching={approaching}
          quiet={!!reduced}
        />
        <div className="entrance-veil" aria-hidden="true" />
        <Link className="entrance-fast-path" href="/ask">
          Go directly to the desk <Icon name="arrow" />
        </Link>
        <main id="main" className="entrance-identity">
          <div className="entrance-seal">
            <ArchiveMark />
          </div>
          <p className="entrance-prelude">SOME STORIES ARE NEVER FINISHED.</p>
          <h1>Pensieve</h1>
          <p className="entrance-subtitle">THE MIDNIGHT ARCHIVE</p>
          <div className="entrance-divider" aria-hidden="true">
            <i />
            <span>✦</span>
            <i />
          </div>
          <p className="entrance-thesis">
            Ask the story.
            <br />
            <em>Follow the evidence.</em>
          </p>
          <Link
            className="entrance-portal"
            href="/ask"
            onClick={(event) => {
              if (
                reduced ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              )
                return;
              event.preventDefault();
              if (approaching) return;
              setApproaching(true);
              transition.current = setTimeout(() => router.push("/ask"), 480);
            }}
          >
            <span>
              {approaching
                ? "Approaching the reading desk"
                : "Enter the archive"}
            </span>
            <Icon name="arrow" />
          </Link>
          <p className="entrance-promise">
            A question opens the books.
            <br />A thread of light leads you to the source.
          </p>
        </main>
        <footer className="entrance-footer">
          <span>
            THE THRESHOLD <i /> A READING ROOM FOR CURIOUS MINDS
          </span>
          <span>
            RAG <b>✦</b> Full Context <b>✦</b> Evidence
          </span>
          <Link href="/architecture">The workshop · How it works</Link>
        </footer>
      </div>
    </MotionConfig>
  );
}
