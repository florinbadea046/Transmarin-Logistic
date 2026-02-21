// ──────────────────────────────────────────────────────────
// Tipuri de date pentru modulul Rapoarte & Dashboard
// ──────────────────────────────────────────────────────────

export interface KPI {
  label: string;
  value: number;
  unit: string;
  trend?: "up" | "down" | "stable";
  changePercent?: number;
}

export interface ChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface ReportFilter {
  period: "week" | "month" | "quarter" | "year" | "custom";
  startDate?: string;
  endDate?: string;
  truckId?: string;
  clientName?: string;
  route?: string;
}
