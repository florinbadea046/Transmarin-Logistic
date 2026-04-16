import { describe, it, expect } from "vitest";
import { getInitials } from "@/modules/hr/utils/get-initials";

describe("getInitials", () => {
  it("returns first two initials uppercase", () => {
    expect(getInitials("Ion Popescu")).toBe("IP");
    expect(getInitials("maria pop")).toBe("MP");
  });

  it("returns single initial when only one word", () => {
    expect(getInitials("Cher")).toBe("C");
  });

  it("only takes first 2 even with more words", () => {
    expect(getInitials("Ion Maria Popescu Vasile")).toBe("IM");
  });

  it("handles double spaces between words", () => {
    expect(getInitials("Ion  Popescu")).toBe("IP");
  });

  it("returns ? for empty string", () => {
    expect(getInitials("")).toBe("?");
  });

  it("returns ? for whitespace only", () => {
    expect(getInitials("   ")).toBe("?");
  });
});
