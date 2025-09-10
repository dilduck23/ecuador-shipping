import type { AppConfig } from "@remix-run/dev";

export default {
  ignoredRouteFiles: ["**/.*"],
  serverBuildPath: "build/server/index.js",
  assetsBuildDirectory: "public/build",
  future: {
    v3_fetcherPersist: true,
    v3_relativeSplatPath: true,
    v3_throwAbortReason: true,
    v3_lazyRouteDiscovery: true,
    v3_singleFetch: false
  }
} satisfies AppConfig;
