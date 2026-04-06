// ──────────────────────────────────────────────────────────
// Tipuri de date pentru modulul Resurse Umane
// ──────────────────────────────────────────────────────────

export interface Employee {
  id: string;
  name: string;
  position: string; // ex: "CEO", "Manager", "Developer"
  department: string;
  phone: string;
  email: string;
  hireDate: string;
  salary: number;
  documents: EmployeeDocument[];
  managerId?: string | null; // id-ul managerului direct, null pentru CEO
}

export interface EmployeeDocument {
  id: string;
  type: "license" | "tachograph" | "adr" | "medical" | "contract" | "certificate" | "other";
  name: string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  notes?: string;
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

export interface HRSettings {
  defaultLeaveDays: number;        // nr. zile concediu/an, default 21
  leaveTypes: string[];            // tipuri concediu configurabile
  documentAlertDays: number;       // prag alertă documente în zile, default 30
  departments: string[];           // departamente disponibile (CRUD)
  documentNumberFormat: string;    // format nr. document
  bonusCurrency: "RON" | "EUR";   // moneda bonusuri
}

export type AttendanceStatus = "P" | "CO" | "CM" | "A" | "LP";

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
}
