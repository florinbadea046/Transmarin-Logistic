// ──────────────────────────────────────────────────────────
// Vitest global setup — runs before every test file
// ──────────────────────────────────────────────────────────

import { beforeEach } from "vitest";

// Mock localStorage for all tests (works in both node and DOM environments)
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
})();

// Polyfill globals for node environment
if (typeof globalThis.localStorage === "undefined") {
  Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });
}
if (typeof globalThis.window === "undefined") {
  Object.defineProperty(globalThis, "window", { value: globalThis });
}

// Reset localStorage before each test
beforeEach(() => {
  localStorageMock.clear();
});
