// ──────────────────────────────────────────────────────────
// Unit tests: Financial report utilities
// File: src/modules/reports/financial-reports-utils.ts
//
// Ce trebuie testat:
// - formatCurrency: formats number as RON with 2 decimals and thousands separator
// - stripDiacritics: removes Romanian diacritics from strings (ă, â, î, ș, ț)
// - buildBarData: handles empty data array without errors, returns empty structure
// - buildPieData: limits categories to 6 max, groups remaining into "Altele" (Other)
// ──────────────────────────────────────────────────────────

import { describe, it } from "vitest";

describe("financial-reports-utils", () => {
  it.todo("placeholder — implementeaza testele");
});
