// ──────────────────────────────────────────────────────────
// Tipuri de date pentru modulul Contabilitate Simplificată
// ──────────────────────────────────────────────────────────

export interface Invoice {
  id: string;
  type: "income" | "expense";
  number: string;
  date: string;
  dueDate: string;
  supplierId?: string;
  clientName: string;
  items: InvoiceItem[];
  totalWithoutVAT: number;
  vat: number;
  total: number;
  status: "draft" | "sent" | "paid" | "overdue";
  attachmentName?: string; // simulare atașament
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Supplier {
  id: string;
  name: string;
  cui: string; // Cod Unic de Înregistrare
  address: string;
  phone: string;
  email: string;
  bankAccount: string;
}
