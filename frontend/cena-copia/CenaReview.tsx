"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { archiveDirector } from "@/features/archive/director";

const CenaCanvas = dynamic(
  () => import("./CenaCanvas").then((mod) => mod.CenaCanvas),
  { ssr: false },
);

export function CenaReview() {
  useEffect(() => {
    archiveDirector.jumpToDesk();
    return () => {
      archiveDirector.dispose();
    };
  }, []);
  return <CenaCanvas />;
}
