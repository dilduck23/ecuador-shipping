/// <reference types="vite/client" />

import { defineConfig, type Plugin } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

installGlobals({ nativeFetch: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function importAttributesCompat(): Plugin {
  return {
    name: "import-attributes-compat",
    enforce: "pre",
    load(id) {
      if (!id.includes("node_modules")) return null;
      const code = fs.readFileSync(id, "utf8");
      const patched = code.replace(
        /from\s+([\'\"][^\'\"]+\.json[\'\"])\s+with\s*{\s*type\s*:\s*['"]json['"]\s*\}/g,
        "from $1 assert { type: 'json' }",
      );
      return patched === code ? null : patched;
    },
  };
}

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    importAttributesCompat(),
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
  ],

  // Alias para locales de Polaris y módulos nativos de Node
  resolve: {
    alias: {
      "@shopify/polaris/locales/en.json": path.resolve(
        __dirname,
        "app/aliases/polaris-en.js",
      ),
      crypto: "node:crypto",
      path: "node:path",
      fs: "node:fs",
    },
  },

  // No intentes optimizar/bundlear estas librerías
  optimizeDeps: {
    exclude: [
      "@shopify/shopify-app-remix",
      "@shopify/polaris/locales/en.json",
      "@vercel/remix",
    ],
  },

  // Construcción estándar
  build: { assetsInlineLimit: 0 },

  server: {
    port: Number(process.env.PORT || 3000),
    fs: { allow: ["app", "node_modules"] },
  },
});
