import type { NextConfig } from "next";

import("./src/env");

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  rewrites() {
    return [
      {
        source: "/api/analytics/static/:path*",
        destination: "https://eu.i.posthog.com/static/:path*",
      },
      {
        source: "/api/analytics/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
    ];
  },
};

export default nextConfig;
