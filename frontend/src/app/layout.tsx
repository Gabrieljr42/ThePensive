import type { Metadata } from "next";
import "@fontsource/libre-caslon-display/index.css";
import "@fontsource-variable/newsreader/index.css";
import "@fontsource-variable/newsreader/opsz-italic.css";
import "@fontsource/ibm-plex-mono/index.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pensieve — The Midnight Archive",
  description:
    "Ask the story. Follow the evidence. An enchanted research archive comparing RAG and Full Context.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="pensieve-root">
      <body className="pensieve-body">{children}</body>
    </html>
  );
}
