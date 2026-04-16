import { describe, it, expect } from "vitest";
import {
  ALL_STATUSES,
  calcAverage,
  getEmpName,
} from "@/modules/hr/pages/_components/evaluations-types";
import type { Employee, CriterionScore } from "@/modules/hr/types";

describe("ALL_STATUSES sentinel", () => {
  it("is a unique non-empty string", () => {
    expect(ALL_STATUSES).toBe("__all__");
  });
});

describe("calcAverage", () => {
  it("returns 0 for empty list", () => {
    expect(calcAverage([])).toBe(0);
  });

  it("returns the value for a single criterion", () => {
    const c: CriterionScore[] = [{ criterion: "punctuality", score: 4, comment: "" }];
    expect(calcAverage(c)).toBe(4);
  });

  it("returns the average of multiple scores", () => {
    const c: CriterionScore[] = [
      { criterion: "punctuality", score: 5, comment: "" },
      { criterion: "quality", score: 3, comment: "" },
      { criterion: "collaboration", score: 4, comment: "" },
    ];
    expect(calcAverage(c)).toBe(4);
  });

  it("rounds to 2 decimals", () => {
    const c: CriterionScore[] = [
      { criterion: "punctuality", score: 5, comment: "" },
      { criterion: "quality", score: 4, comment: "" },
      { criterion: "collaboration", score: 4, comment: "" },
    ];
    expect(calcAverage(c)).toBe(4.33);
  });
});

describe("getEmpName", () => {
  const employees: Employee[] = [
    { id: "e1", name: "Ion Popescu", position: "x", department: "y", phone: "", email: "", hireDate: "", salary: 0, documents: [] },
  ];

  it("returns name when employee found", () => {
    expect(getEmpName(employees, "e1")).toBe("Ion Popescu");
  });

  it("returns id when employee not found (graceful fallback)", () => {
    expect(getEmpName(employees, "missing")).toBe("missing");
  });

  it("returns id when list is empty", () => {
    expect(getEmpName([], "e1")).toBe("e1");
  });
});
