import type { NextConfig } from "next";

// Cache Components is intentionally off. Opportunity data comes from a live
// Google Sheet, so data routes render per request and the sheet is cached
// in memory by the data layer (see lib/data/source.ts). This keeps builds
// independent of the sheet being reachable and never caches a failed fetch.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
