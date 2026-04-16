// ──────────────────────────────────────────────────────────
// Vitest global setup — runs before every test file
// ──────────────────────────────────────────────────────────

import "@testing-library/jest-dom/vitest";

// jsdom does not implement matchMedia — many components rely on it (useMobile)
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
