import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.PENSIEVE_ISOLATED_BUILD === "true" ? ".next-backend-check" : ".next",
  output: "standalone",
  poweredByHeader: false,
  devIndicators: false,
  images: { qualities: [85] },
};

export default nextConfig;
