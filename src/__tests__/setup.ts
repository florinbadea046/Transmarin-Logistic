// ──────────────────────────────────────────────────────────
// Vitest global setup — runs before every test file
// ──────────────────────────────────────────────────────────

import "@testing-library/jest-dom/vitest";

// Mock localStorage for all tests
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

Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Reset localStorage before each test
beforeEach(() => {
  localStorage.clear();
});
