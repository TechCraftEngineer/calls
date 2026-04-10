import { createJiti } from "jiti";
import type { NextConfig } from "next";

const jiti = createJiti(import.meta.url);

// Import env files to validate at build time. Use jiti so we can load .ts files in here.
await jiti.import("./src/env");
const nextConfig: NextConfig = {
  async rewrites() {
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
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
