import { MidnightArchive } from "@/features/archive/MidnightArchive";

interface PageProps {
  searchParams?: Promise<{ at?: string }>;
}

export default async function Home({ searchParams }: PageProps) {
  const resolved = searchParams ? await searchParams : {};
  const initialPhase = resolved?.at === "desk" ? "desk" : "dark";

  return <MidnightArchive initialPhase={initialPhase} />;
}
