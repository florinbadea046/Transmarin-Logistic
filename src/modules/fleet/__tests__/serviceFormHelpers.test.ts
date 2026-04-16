import { describe, it, expect } from "vitest";
import { createEmptyForm } from "@/modules/fleet/utils/serviceFormHelpers";

describe("createEmptyForm", () => {
  it("starts with empty truckId/date/description", () => {
    const f = createEmptyForm();
    expect(f.truckId).toBe("");
    expect(f.date).toBe("");
    expect(f.description).toBe("");
  });

  it("defaults type to 'revision'", () => {
    expect(createEmptyForm().type).toBe("revision");
  });

  it("starts with mileage 0", () => {
    expect(createEmptyForm().mileageAtService).toBe(0);
  });

  it("starts with empty parts array", () => {
    expect(createEmptyForm().partsUsed).toEqual([]);
  });

  it("returns a fresh object each call (no shared reference)", () => {
    const a = createEmptyForm();
    const b = createEmptyForm();
    a.truckId = "mutated";
    expect(b.truckId).toBe("");
    expect(a.partsUsed).not.toBe(b.partsUsed);
  });
});
