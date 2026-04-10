import type { Employee, CriterionScore } from "@/modules/hr/types";

// ── Helpers ───────────────────────────────────────────────

export const ALL_STATUSES = "__all__";

export function calcAverage(criteria: CriterionScore[]): number {
  if (!criteria.length) return 0;
  const sum = criteria.reduce((s, c) => s + c.score, 0);
  return Math.round((sum / criteria.length) * 100) / 100;
}

export function getEmpName(employees: Employee[], id: string): string {
  return employees.find((e) => e.id === id)?.name ?? id;
}
