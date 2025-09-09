/// <reference types="vite/client" />

import { defineConfig, type Plugin } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";

// ⚠️ Solo si vas a desplegar en Vercel:
import { vercelPreset } from "@vercel/remix/vite";

// Necesario para Remix en runtime (fetch, FormData, etc)
installGlobals({ nativeFetch: true });

/**
 * Parche mínimo: convierte
 *   import data from 'x.json' with { type: 'json' }
 * a:
 *   import data from 'x.json' assert { type: 'json' }
 * durante el parseo.
 */
function importAttributesCompat(): Plugin {
  return {
    name: "import-attributes-compat",
    enforce: "pre",
    transform(code, id) {
      if (!id.includes("node_modules")) return null;
      // súper conservador: sólo cuando el import termina en .json
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
    // Remix plugin (no lo quites)
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
    // ⚠️ Sólo si despliegas en Vercel. Si no, comenta esta línea.
    vercelPreset(),
    // Parche de import attributes
    importAttributesCompat(),
  ],

  // Evita que Vite intente pre-optimizar/bundlear estas libs
  optimizeDeps: {
    exclude: [
      "@vercel/remix",
      "@shopify/shopify-app-remix",
      "@shopify/polaris/locales/en.json",
    ],
  },

  // En SSR, NO intentes bundlear @vercel/remix (manténlo externo)
  ssr: {
    external: ["@vercel/remix"],
  },

  // CORS/HMR iguales a los que ya usabas (opcional)
  server: {
    port: Number(process.env.PORT || 3000),
    fs: { allow: ["app", "node_modules"] },
  },

  build: {
    assetsInlineLimit: 0,
  },
});
