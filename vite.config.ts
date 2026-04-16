/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// Grupeaza dependintele din node_modules in chunk-uri logice stabile (cache-friendly
// peste deploys). Pachetele rare raman in vendor-ul general.
function vendorChunkFor(id: string): string | undefined {
  if (!id.includes("node_modules")) return undefined;

  if (id.includes("/react-dom/") || id.includes("/react/") || id.includes("/scheduler/")) {
    return "react-vendor";
  }
  if (id.includes("/@tanstack/")) return "tanstack-vendor";
  if (id.includes("/@radix-ui/") || id.includes("/cmdk/") || id.includes("/sonner/")) {
    return "radix-vendor";
  }
  if (id.includes("/recharts/") || id.includes("/d3-") || id.includes("/victory-vendor/")) {
    return "charts-vendor";
  }
  if (id.includes("/react-hook-form/") || id.includes("/@hookform/") || id.includes("/zod/")) {
    return "form-vendor";
  }
  if (
    id.includes("/i18next") ||
    id.includes("/react-i18next/") ||
    id.includes("/i18next-browser-languagedetector/")
  ) {
    return "i18n-vendor";
  }
  if (id.includes("/date-fns/")) return "date-vendor";
  if (id.includes("/lucide-react/")) return "icons-vendor";

  // leaflet/xlsx/jspdf/html2canvas/papaparse sunt importate dinamic;
  // Vite le va pune in chunk-uri dedicate automat, nu le grupam aici.
  return undefined;
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: vendorChunkFor,
      },
    },
    chunkSizeWarningLimit: 600,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/modules/transport/__tests__/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    css: false,
  },
});
