import { describe, it, expect } from "vitest";
import { savePart, deletePart, isLowStock } from "@/modules/fleet/utils/partsUtils";
import type { Part } from "@/modules/fleet/types";

const makePart = (id: string, qty = 10, min = 5): Part => ({
  id,
  code: "P-001",
  name: `Part-${id}`,
  category: "engine",
  supplier: "Bosch",
  unitPrice: 100,
  quantity: qty,
  minStock: min,
});

describe("savePart", () => {
  it("appends new part with generated id when no editingPart", () => {
    const parts: Part[] = [makePart("p1")];
    const newForm = {
      code: "P-NEW",
      name: "Filter",
      category: "engine",
      supplier: "Mahle",
      unitPrice: 50,
      quantity: 20,
      minStock: 5,
    };
    const result = savePart(parts, newForm, null);
    expect(result).toHaveLength(2);
    expect(result[1].name).toBe("Filter");
    expect(result[1].id).toBeTruthy();
  });

  it("updates existing part when editingPart is provided", () => {
    const parts: Part[] = [makePart("p1"), makePart("p2")];
    const editing = parts[1];
    const result = savePart(parts, { ...editing, quantity: 999 }, editing);
    expect(result).toHaveLength(2);
    expect(result[1].quantity).toBe(999);
    expect(result[1].id).toBe("p2");
  });

  it("does not mutate original array when adding", () => {
    const parts: Part[] = [makePart("p1")];
    const before = parts.length;
    savePart(parts, { code: "P-NEW", name: "x", category: "y", supplier: "z", unitPrice: 1, quantity: 1, minStock: 0 }, null);
    expect(parts).toHaveLength(before);
  });
});

describe("deletePart", () => {
  it("removes part with matching id", () => {
    const parts: Part[] = [makePart("p1"), makePart("p2"), makePart("p3")];
    const result = deletePart(parts, "p2");
    expect(result).toHaveLength(2);
    expect(result.find((p) => p.id === "p2")).toBeUndefined();
  });

  it("returns same length when id not found", () => {
    const parts: Part[] = [makePart("p1")];
    const result = deletePart(parts, "missing");
    expect(result).toHaveLength(1);
  });
});

describe("isLowStock", () => {
  it("returns true when quantity < minStock", () => {
    expect(isLowStock(makePart("p1", 3, 5))).toBe(true);
  });

  it("returns false when quantity >= minStock", () => {
    expect(isLowStock(makePart("p1", 5, 5))).toBe(false);
    expect(isLowStock(makePart("p1", 10, 5))).toBe(false);
  });
});
