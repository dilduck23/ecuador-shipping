/// <reference types="vite/client" />

import { defineConfig, type Plugin } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";

installGlobals({ nativeFetch: true });

/**
 * Parche mínimo para vendor: convierte
 *    import x from 'file.json' with { type: 'json' }
 * a
 *    import x from 'file.json' assert { type: 'json' }
 * cuando aparece en node_modules.
 */
function importAttributesCompat(): Plugin {
  return {
    name: "import-attributes-compat",
    enforce: "pre",
    transform(code, id) {
      if (!id.includes("node_modules")) return null;
      const patched = code.replace(
        /from\s+(['"][^'"]+\.json['"])\s+with\s*\{\s*type\s*:\s*['"]json['"]\s*\}/g,
        "from $1 assert { type: 'json' }",
      );
      return patched === code ? null : patched;
    },
  };
}

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    remix({
      ignoredRouteFiles: ["**/.*"],
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_lazyRouteDiscovery: true,
        v3_singleFetch: false,
        v3_routeConfig: true,
      },
    }),
    importAttributesCompat(),
  ],

  // Alias que evita el import con "with { type: 'json' }" de Polaris
  resolve: {
    alias: {
      "@shopify/polaris/locales/en.json": "/app/aliases/polaris-en.js",
    },
  },

  // No intentes optimizar/bundlear estas librerías
  optimizeDeps: {
    exclude: [
      "@shopify/shopify-app-remix",
      "@shopify/polaris/locales/en.json",
    ],
  },

  // Construcción estándar
  build: { assetsInlineLimit: 0 },

  server: {
    port: Number(process.env.PORT || 3000),
    fs: { allow: ["app", "node_modules"] },
  },
});
