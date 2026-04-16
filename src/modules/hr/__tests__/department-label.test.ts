import { describe, it, expect } from "vitest";
import { getEmployeeDepartmentLabel } from "@/modules/hr/utils/department-label";

const t = (k: string) => `T(${k})`;

describe("getEmployeeDepartmentLabel", () => {
  it("translates known departments", () => {
    expect(getEmployeeDepartmentLabel(t, "Dispecerat")).toBe("T(employees.departments.dispatch)");
    expect(getEmployeeDepartmentLabel(t, "Transport")).toBe("T(employees.departments.transport)");
    expect(getEmployeeDepartmentLabel(t, "Service")).toBe("T(employees.departments.service)");
    expect(getEmployeeDepartmentLabel(t, "Contabilitate")).toBe("T(employees.departments.accounting)");
    expect(getEmployeeDepartmentLabel(t, "Administrativ")).toBe("T(employees.departments.administrative)");
  });

  it("returns the raw string for unknown departments", () => {
    expect(getEmployeeDepartmentLabel(t, "IT")).toBe("IT");
    expect(getEmployeeDepartmentLabel(t, "")).toBe("");
  });
});
