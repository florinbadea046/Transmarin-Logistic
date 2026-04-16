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

// ── Evaluări Performanță ──────────────────────────────────

export const EVALUATION_CRITERIA = [
  "punctuality",
  "quality",
  "collaboration",
  "initiative",
  "procedures",
] as const;

export type EvaluationCriterion = (typeof EVALUATION_CRITERIA)[number];

export interface CriterionScore {
  criterion: EvaluationCriterion;
  score: number; // 1–5
  comment: string;
}

export interface PerformanceEvaluation {
  id: string;
  employeeId: string;
  evaluatorId: string;
  period: string; // ex: "2026-Q1", "2026-03"
  criteria: CriterionScore[];
  averageScore: number;
  status: "draft" | "final";
  createdAt: string;
}

export type AttendanceStatus = "P" | "CO" | "CM" | "A" | "LP";

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
}

// ── Training & Certificări ────────────────────────────────

export type TrainingType = "intern" | "extern";

export type TrainingStatus = "planificat" | "in_curs" | "finalizat";

export interface TrainingCertificate {
  id: string;
  employeeId: string;
  issuedAt: string; // ISO
}

export interface Training {
  id: string;
  title: string;
  type: TrainingType;
  date: string; // YYYY-MM-DD
  durationHours: number;
  trainer: string;
  participantIds: string[];
  status: TrainingStatus;
  issuedCertificates: TrainingCertificate[];
}

// ── Planificare Ture / Schimburi ──────────────────────────

export type ShiftType = "morning" | "afternoon" | "night";

export interface Shift {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  type: ShiftType;
}

// ── Recrutare ─────────────────────────────────────────────

export const CANDIDATE_STATUSES = [
  "applied",
  "screening",
  "interview",
  "offer",
  "hired",
  "rejected",
] as const;

export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export interface Candidate {
  id: string;
  name: string;
  position: string;
  email: string;
  phone: string;
  applicationDate: string; // YYYY-MM-DD
  rating: number; // 1..5
  notes?: string;
  status: CandidateStatus;
  createdAt: string; // ISO
  employeeId?: string; // setat după conversia în angajat, previne duplicate
}

// ── Inventar Echipamente ──────────────────────────────────

export const EQUIPMENT_TYPES = [
  "laptop",
  "phone",
  "uniform",
  "key",
  "access_card",
  "other",
] as const;

export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

export const EQUIPMENT_CONDITIONS = [
  "new",
  "good",
  "worn",
  "broken",
] as const;

export type EquipmentCondition = (typeof EQUIPMENT_CONDITIONS)[number];

export interface Equipment {
  id: string;
  type: EquipmentType;
  inventoryNumber: string;
  employeeId: string;
  employeeName?: string;
  assignedDate: string; // YYYY-MM-DD
  returnedDate?: string; // YYYY-MM-DD, termen planificat returnare
  returnedConfirmed?: boolean; // true = efectiv returnat
  condition: EquipmentCondition;
  value: number;
  notes?: string;
}
