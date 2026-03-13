import { createJiti } from "jiti";
import { NextConfig } from "next";

export default async function createNextConfig(): Promise<NextConfig> {
  const jiti = createJiti(import.meta.url);

  // Import env files to validate at build time. Use jiti so we can load .ts files in here.
  await jiti.import("./src/env");

  /** @type {import("next").NextConfig} */
  const config: NextConfig = {
    /** Enables hot reloading for local packages without a build step */
    ...(process.env.CI === "true" && { output: "standalone" }),

    /** Exclude packages using Node.js APIs or dynamic require from bundling */
    serverExternalPackages: [
      "@qbs-autonaim/lib",
      "@qbs-autonaim/document-processor",
      "@qbs-autonaim/integration-clients",
      "@qbs-autonaim/jobs-parsers",
      "cheerio",
    ],

    /** Build optimizations */
    experimental: {
      optimizePackageImports: [
        "@qbs-autonaim/ui",
        "@radix-ui/react-icons",
        "lucide-react",
        "@tabler/icons-react",
      ],
      optimizeCss: true,
    },

    /** Source maps только для production builds (не публикуются) */
    productionBrowserSourceMaps: false,

    transpilePackages: [
      "@qbs-autonaim/auth",
      "@qbs-autonaim/api",
      "@qbs-autonaim/db",
      "@qbs-autonaim/ui",
      "@qbs-autonaim/validators",
    ],

    /** We already do linting and typechecking as separate tasks in CI */
    typescript: { ignoreBuildErrors: true },

    /** Disable overlay in test environment */
    ...(process.env.NODE_ENV === "test" && {
      compiler: {
        removeConsole: false,
      },
    }),

    /** Security headers */
    async headers() {
      return [
        {
          source: "/(.*)",
          headers: [
            {
              key: "X-Content-Type-Options",
              value: "nosniff",
            },
            {
              key: "X-Frame-Options",
              value: "DENY",
            },
            {
              key: "X-XSS-Protection",
              value: "1; mode=block",
            },
            {
              key: "Referrer-Policy",
              value: "strict-origin-when-cross-origin",
            },
            {
              key: "Permissions-Policy",
              value: "camera=(), microphone=(), geolocation=()",
            },
          ],
        },
      ];
    },

    /** Proxy API routes to app-server */
    async rewrites() {
      const appServerUrl =
        process.env.APP_SERVER_URL || "http://localhost:7000";

      return [
        {
          source: "/api/auth/:path*",
          destination: `${appServerUrl}/api/auth/:path*`,
        },
        // /api/orpc — через Route Handler (app/api/orpc/[...path]/route.ts)
        // с таймаутом 120 сек для локальной разработки (parseResume)
        // {
        //   source: "/api/orpc/:path*",
        //   destination: `${appServerUrl}/api/orpc/:path*`,
        // },
        {
          source: "/api/chat/stream",
          destination: `${appServerUrl}/api/chat/stream`,
        },
        {
          source: "/api/vacancy/chat-generate",
          destination: `${appServerUrl}/api/vacancy/chat-generate`,
        },
        {
          source: "/api/gig/chat-generate",
          destination: `${appServerUrl}/api/gig/chat-generate`,
        },
        {
          source: "/api/resume/:path*",
          destination: `${appServerUrl}/api/resume/:path*`,
        },
        {
          source: "/api/test/:path*",
          destination: `${appServerUrl}/api/test/:path*`,
        },
      ];
    },
  };

  return config;
}
