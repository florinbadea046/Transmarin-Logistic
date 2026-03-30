// ── Types ─────────────────────────────────────────────────────────────────────
export type InvoiceType = "venit" | "cheltuială";
export type InvoiceStatus = "plătită" | "neplatită" | "parțial" | "anulată";

export interface InvoiceLine {
  id: string;
  descriere: string;
  cantitate: number;
  pretUnitar: number;
}

export interface Invoice {
  id: string;
  nr: string;
  tip: InvoiceType;
  data: string;
  scadenta: string;
  clientFurnizor: string;
  linii: InvoiceLine[];
  status: InvoiceStatus;
}

export interface FormState {
  tip: InvoiceType;
  nr: string;
  data: string;
  scadenta: string;
  clientFurnizor: string;
  linii: InvoiceLine[];
  status: InvoiceStatus;
}

// ── Constants ─────────────────────────────────────────────────────────────────
export const FURNIZORI = ["SC Alpha SRL", "SC Beta SRL", "SC Gamma SA", "SC Delta SRL", "SC Epsilon SRL"];

export const statusColor: Record<InvoiceStatus, string> = {
  plătită:   "bg-green-500/20 text-green-400 border-green-500/30",
  neplatită: "bg-red-500/20 text-red-400 border-red-500/30",
  parțial:   "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  anulată:   "bg-gray-500/20 text-gray-400 border-gray-500/30",
};
