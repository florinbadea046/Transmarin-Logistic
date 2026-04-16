// ──────────────────────────────────────────────────────────
// Unit tests: Service utility functions
// File: src/modules/fleet/utils/serviceUtils.ts
// ──────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import {
  getTypeLabels,
  getPartName,
  getPartPrice,
  calculateTotalCost,
} from "@/modules/fleet/utils/serviceUtils";
import type { Part } from "@/modules/fleet/types";

const t = (k: string) => k;

describe("getTypeLabels", () => {
  it("returns labels for all 4 service types", () => {
    const labels = getTypeLabels(t);
    expect(Object.keys(labels).sort()).toEqual(["itp", "other", "repair", "revision"]);
  });

  it("uses i18n keys for labels", () => {
    expect(getTypeLabels(t).revision).toBe("fleet.service.typeRevision");
    expect(getTypeLabels(t).itp).toBe("fleet.service.typeItp");
  });
});

describe("getPartName", () => {
  const parts: Part[] = [
    { id: "p1", name: "Filter Bosch", category: "engine", code: "FB-1", quantity: 10, unitPrice: 50, supplier: "Bosch", minStock: 5 },
    { id: "p2", name: "Tire Michelin", category: "body", code: "TM-1", quantity: 4, unitPrice: 200, supplier: "Michelin", minStock: 4 },
  ];

  it("returns name for known id", () => {
    expect(getPartName(parts, "p1")).toBe("Filter Bosch");
  });

  it("returns id when not found (graceful fallback)", () => {
    expect(getPartName(parts, "missing")).toBe("missing");
  });

  it("returns id from empty list", () => {
    expect(getPartName([], "anything")).toBe("anything");
  });
});

describe("getPartPrice", () => {
  const parts: Part[] = [
    { id: "p1", name: "Filter", category: "engine", code: "FB", quantity: 10, unitPrice: 50, supplier: "Bosch", minStock: 5 },
  ];

  it("returns unit price for known id", () => {
    expect(getPartPrice(parts, "p1")).toBe(50);
  });

  it("returns 0 when not found", () => {
    expect(getPartPrice(parts, "missing")).toBe(0);
  });
});

describe("calculateTotalCost", () => {
  const parts: Part[] = [
    { id: "p1", name: "A", category: "engine", code: "A", quantity: 10, unitPrice: 50, supplier: "x", minStock: 5 },
    { id: "p2", name: "B", category: "engine", code: "B", quantity: 10, unitPrice: 100, supplier: "x", minStock: 5 },
  ];

  it("returns 0 for empty parts used", () => {
    expect(calculateTotalCost([], parts)).toBe(0);
  });

  it("sums (price * quantity) per part", () => {
    expect(
      calculateTotalCost(
        [
          { partId: "p1", quantity: 2 },
          { partId: "p2", quantity: 3 },
        ],
        parts,
      ),
    ).toBe(2 * 50 + 3 * 100);
  });

  it("treats unknown partId as 0 cost", () => {
    expect(
      calculateTotalCost([{ partId: "missing", quantity: 5 }], parts),
    ).toBe(0);
  });

  it("handles fractional quantities", () => {
    expect(
      calculateTotalCost([{ partId: "p1", quantity: 0.5 }], parts),
    ).toBe(25);
  });
});
