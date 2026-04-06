import type { InvoiceType, InvoiceLine, Invoice, FormState } from "./invoices-types";
import { FURNIZORI } from "./invoices-types";

// ── Helpers ───────────────────────────────────────────────────────────────────
export const generateNr = (tip: InvoiceType) => {
  const prefix = tip === "venit" ? "FACT" : "CHELT";
  return `${prefix}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;
};

export const calcLineTotals = (linii: InvoiceLine[]) => {
  const totalFaraTVA = linii.reduce((sum, l) => sum + l.cantitate * l.pretUnitar, 0);
  const tva = totalFaraTVA * 0.19;
  return { totalFaraTVA, tva, total: totalFaraTVA + tva };
};

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON" }).format(amount);

export const emptyLine = (): InvoiceLine => ({
  id: crypto.randomUUID(),
  descriere: "",
  cantitate: 1,
  pretUnitar: 0,
});

export const defaultForm = (): FormState => ({
  tip: "venit",
  nr: generateNr("venit"),
  data: new Date().toISOString().slice(0, 10),
  scadenta: "",
  clientFurnizor: FURNIZORI[0],
  linii: [emptyLine()],
  status: "neplatită",
});

// ── Mock Data ─────────────────────────────────────────────────────────────────
export const initialMock: Invoice[] = [
  {
    id: "1", nr: "FACT-2024-001", tip: "venit", data: "2024-01-10", scadenta: "2024-02-10",
    clientFurnizor: "SC Alpha SRL",
    linii: [{ id: "l1", descriere: "Transport marfă", cantitate: 2, pretUnitar: 2500 }],
    status: "plătită",
  },
  {
    id: "2", nr: "CHELT-2024-002", tip: "cheltuială", data: "2024-01-15", scadenta: "2024-02-15",
    clientFurnizor: "SC Beta SRL",
    linii: [{ id: "l2", descriere: "Combustibil", cantitate: 400, pretUnitar: 5 }],
    status: "neplatită",
  },
  {
    id: "3", nr: "FACT-2024-003", tip: "venit", data: "2024-01-20", scadenta: "2024-02-20",
    clientFurnizor: "SC Gamma SA",
    linii: [
      { id: "l3", descriere: "Transport intern", cantitate: 5, pretUnitar: 1000 },
      { id: "l4", descriere: "Taxă urgență", cantitate: 1, pretUnitar: 500 },
    ],
    status: "parțial",
  },
];
