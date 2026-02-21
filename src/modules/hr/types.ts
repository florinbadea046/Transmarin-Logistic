// ──────────────────────────────────────────────────────────
// Tipuri de date pentru modulul Resurse Umane
// ──────────────────────────────────────────────────────────

export interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;
  phone: string;
  email: string;
  hireDate: string;
  salary: number;
  documents: EmployeeDocument[];
}

export interface EmployeeDocument {
  id: string;
  type: "license" | "tachograph" | "adr" | "medical" | "contract" | "other";
  name: string;
  expiryDate?: string;
  isExpired?: boolean;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: "annual" | "sick" | "unpaid" | "other";
  startDate: string;
  endDate: string;
  days: number;
  status: "pending" | "approved" | "rejected";
  reason?: string;
}

export interface Bonus {
  id: string;
  employeeId: string;
  type: "diurna" | "bonus" | "amenda" | "ore_suplimentare";
  amount: number;
  date: string;
  description: string;
}
