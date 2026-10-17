import type { Metadata } from "next";
import { CenaReview } from "../../../../cena-copia/CenaReview";

export const metadata: Metadata = {
  title: "Cópia da cena — penseira",
  robots: { index: false, follow: false },
};

export default function CenaPage() {
  return <CenaReview />;
}
