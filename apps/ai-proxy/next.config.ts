import { createJiti } from "jiti";
import type { NextConfig } from "next";

export default async function createNextConfig(): Promise<NextConfig> {
  const jiti = createJiti(import.meta.url);

  // Import env files to validate at build time. Use jiti so we can load .ts files in here.
  await jiti.import("./src/env");

  /** @type {import("next").NextConfig} */
  const config: NextConfig = {
    /** Enables hot reloading for local packages without a build step */
    ...(process.env.CI === "true" && { output: "standalone" }),

    /** Source maps только для production builds (не публикуются) */
    productionBrowserSourceMaps: false,

    /** We already do linting and typechecking as separate tasks in CI */
    typescript: { ignoreBuildErrors: true },

    /** Proxy API routes to app-server */
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
  };

  return config;
}
