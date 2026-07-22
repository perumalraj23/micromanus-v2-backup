import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Persists Turbopack's build cache to .next/ between `next build` runs, so unchanged
    // modules aren't re-bundled from scratch every time (real ~2x speedup measured on this
    // repo's own build — see docs/reports/13_REPORT.md). Marked experimental for production
    // builds by Next.js; dev caching (turbopackFileSystemCacheForDev) is already on by default
    // in this Next.js version and needs no config.
    turbopackFileSystemCacheForBuild: true,
  },
};

export default nextConfig;
