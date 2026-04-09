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


export type PaymentMethod = "transfer" | "cash" | "card" | "CEC";
export type PaymentStatus = "confirmata" | "in_asteptare";
export type PaymentDirection = "income" | "expense";
 
export interface Payment {
  id: string;
  invoiceId: string;       // link catre factura
  invoiceNumber: string;   // nr factura (afisat in tabel)
  clientName: string;      // client sau furnizor
  direction: PaymentDirection;
  amount: number;          // suma platita
  date: string;            // yyyy-MM-dd
  method: PaymentMethod;
  bankRef?: string;        // referinta bancara
  status: PaymentStatus;
  notes?: string;
  createdAt: string;
}