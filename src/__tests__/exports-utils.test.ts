import { describe, it, expect } from "vitest";
import { stripDiacritics } from "@/utils/exports/strip-diacritics";

describe("stripDiacritics (corrected, used by new shared exports)", () => {
  it("converts ă/â to a, Ă/Â to A", () => {
    expect(stripDiacritics("ă")).toBe("a");
    expect(stripDiacritics("Ă")).toBe("A");
    expect(stripDiacritics("â")).toBe("a");
    expect(stripDiacritics("Â")).toBe("A");
  });

  it("converts î to i, Î to I", () => {
    expect(stripDiacritics("î")).toBe("i");
    expect(stripDiacritics("Î")).toBe("I");
  });

  it("converts ș/ş to s, Ș/Ş/Š to S", () => {
    expect(stripDiacritics("ș")).toBe("s");
    expect(stripDiacritics("Ș")).toBe("S");
    expect(stripDiacritics("ş")).toBe("s");
  });

  it("converts ț/ţ to t, Ț/Ţ/Ť to T", () => {
    expect(stripDiacritics("ț")).toBe("t");
    expect(stripDiacritics("Ț")).toBe("T");
    expect(stripDiacritics("ţ")).toBe("t");
  });

  it("preserves regular ASCII characters", () => {
    expect(stripDiacritics("Hello World 123")).toBe("Hello World 123");
  });

  it("converts complete Romanian phrases correctly", () => {
    expect(stripDiacritics("Constanța — București")).toBe("Constanta — Bucuresti");
    expect(stripDiacritics("Iași și Brașov")).toBe("Iasi si Brasov");
    expect(stripDiacritics("Țara Românească")).toBe("Tara Romaneasca");
  });
});
