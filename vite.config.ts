import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import { defineConfig, type UserConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { vercelPreset } from "@vercel/remix/vite";

installGlobals({ nativeFetch: true });

// Fix temporal: compat para import attributes `with { type: "json" }` en node_modules
function importAttributesCompat() {
  return {
    name: "import-attributes-compat",
    enforce: "pre" as const,
    transform(code: string, id: string) {
      if (!id.includes("node_modules")) return null;
      if (!id.endsWith(".mjs") && !id.endsWith(".js")) return null;

      // Reescribe `with { type: 'json' }` -> `assert { type: 'json' }`
      if (code.includes(" with { type: 'json' }") || code.includes(' with { type: "json" }')) {
        const patched = code.replace(
          / with \{\s*type:\s*['"]json['"]\s*\}/g,
          " assert { type: 'json' }"
        );
        return { code: patched, map: null };
      }
      return null;
    },
  };
}

// Workaround HOST -> SHOPIFY_APP_URL (tu lógica original)
if (
  process.env.HOST &&
  (!process.env.SHOPIFY_APP_URL || process.env.SHOPIFY_APP_URL === process.env.HOST)
) {
  process.env.SHOPIFY_APP_URL = process.env.HOST;
  delete process.env.HOST;
}

const host = new URL(process.env.SHOPIFY_APP_URL || "http://localhost").hostname;

let hmrConfig;
if (host === "localhost") {
  hmrConfig = {
    protocol: "ws",
    host: "localhost",
    port: 64999,
    clientPort: 64999,
  };
} else {
  hmrConfig = {
    protocol: "wss",
    host: host,
    port: parseInt(process.env.FRONTEND_PORT!) || 8002,
    clientPort: 443,
  };
}

export default defineConfig({
  server: {
    allowedHosts: [host],
    cors: { preflightContinue: true },
    port: Number(process.env.PORT || 3000),
    hmr: hmrConfig,
    fs: { allow: ["app", "node_modules"] },
  },
  plugins: [
    // 👇 aplica el parche antes de todo
    importAttributesCompat(),
    remix({
      ignoredRouteFiles: ["**/.*"],
      // 👇 preset oficial de Vercel para Remix + Vite
      presets: [vercelPreset()],
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_lazyRouteDiscovery: true,
        v3_singleFetch: false,
        v3_routeConfig: true,
      },
    }),
    tsconfigPaths(),
  ],
  build: {
    assetsInlineLimit: 0,
  },
  optimizeDeps: {
    // Incluye solo lo necesario del lado cliente
    include: ["@shopify/app-bridge-react", "@shopify/polaris"],
    // 🚫 No intentes prebundlear el preset ni el paquete de la app de Shopify
    exclude: ["@vercel/remix", "@shopify/shopify-app-remix", "@shopify/polaris"],
    esbuildOptions: {
      // Evita que esbuild “optimice” import attributes raros
      supported: {
        "import-assertions": true,
      },
    },
  },
  ssr: {
    // Evita que Vite intente resolver raro en SSR
    noExternal: ["@shopify/shopify-app-remix", "@shopify/polaris", "@shopify/app-bridge-react"],
  },
}) satisfies UserConfig;
