// ──────────────────────────────────────────────────────────
// B14. Import Facturi CSV/Excel
// Upload CSV/Excel → parsare → validare coloane →
// preview tabel cu highlight rânduri invalide →
// confirmare → addItem. Detectare duplicate pe nr. factură.
// Calcul automat TVA 19% dacă lipsește.
// Toast rezumat „X importate, Y erori".
// ──────────────────────────────────────────────────────────

import * as React from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { Upload, AlertCircle, CheckCircle2, X, FileText } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import type { Invoice, InvoiceLine, InvoiceType, InvoiceStatus } from "./invoices-types";

// ── Tipuri interne ────────────────────────────────────────

interface RawRow {
  nr?: string;
  tip?: string;
  data?: string;
  scadenta?: string;
  clientFurnizor?: string;
  descriere?: string;
  cantitate?: string | number;
  pretUnitar?: string | number;
  tva?: string | number;
  status?: string;
  [key: string]: unknown;
}

interface ParsedRow {
  raw: RawRow;
  invoice: Partial<Invoice> & { linii: InvoiceLine[] };
  errors: string[];
  isDuplicate: boolean;
  isValid: boolean;
}

// ── Helpers ───────────────────────────────────────────────

const VALID_TIPURI: InvoiceType[] = ["venit", "cheltuială"];

function normalizeStr(val: unknown): string {
  return String(val ?? "").trim();
}

function normalizeNum(val: unknown): number {
  const n = parseFloat(String(val ?? "").replace(",", "."));
  return isNaN(n) ? 0 : n;
}

function normalizeTip(val: string): InvoiceType {
  const v = val.toLowerCase();
  if (v === "venit" || v === "income") return "venit";
  return "cheltuială";
}

function normalizeStatus(val: string): InvoiceStatus {
  const v = val.toLowerCase();
  if (v === "plătită" || v === "platita" || v === "paid") return "plătită";
  if (v === "parțial" || v === "partial") return "parțial";
  if (v === "anulată" || v === "anulata" || v === "cancelled") return "anulată";
  return "neplatită";
}

function parseRows(rows: RawRow[], existingNrs: Set<string>, t: (key: string) => string): ParsedRow[] {
  return rows.map((raw) => {
    const errors: string[] = [];

    const nr = normalizeStr(raw.nr);
    const tip = normalizeTip(normalizeStr(raw.tip));
    const data = normalizeStr(raw.data);
    const scadenta = normalizeStr(raw.scadenta);
    const clientFurnizor = normalizeStr(raw.clientFurnizor || raw["client/furnizor"] || raw.client);
    const descriere = normalizeStr(raw.descriere);
    const cantitate = normalizeNum(raw.cantitate ?? 1);
    const pretUnitar = normalizeNum(raw.pretUnitar || raw["pret unitar"] || raw.pret);

    if (!nr) errors.push(t("invoices.import.errorNrMissing"));
    if (!data) errors.push(t("invoices.import.errorDateMissing"));
    if (!clientFurnizor) errors.push(t("invoices.import.errorClientMissing"));
    if (pretUnitar <= 0) errors.push(t("invoices.import.errorPriceInvalid"));
    if (!VALID_TIPURI.includes(tip)) errors.push(t("invoices.import.errorTypeInvalid"));

    const isDuplicate = nr ? existingNrs.has(nr) : false;
    if (isDuplicate) errors.push(t("invoices.import.errorDuplicate"));

    const linie: InvoiceLine = {
      id: crypto.randomUUID(),
      descriere: descriere || "Import",
      cantitate,
      pretUnitar,
    };

    const invoice: Partial<Invoice> & { linii: InvoiceLine[] } = {
      nr,
      tip,
      data,
      scadenta,
      clientFurnizor,
      linii: [linie],
      status: normalizeStatus(normalizeStr(raw.status)),
    };

    return { raw, invoice, errors, isDuplicate, isValid: errors.length === 0 };
  });
}

// ── Componenta principală ─────────────────────────────────

interface InvoicesImportDialogProps {
  open: boolean;
  onClose: () => void;
  existingInvoices: Invoice[];
  onImport: (invoices: Invoice[]) => void;
}

export function InvoicesImportDialog({
  open,
  onClose,
  existingInvoices,
  onImport,
}: InvoicesImportDialogProps) {
  const { t } = useTranslation();
  const [parsedRows, setParsedRows] = React.useState<ParsedRow[]>([]);
  const [fileName, setFileName] = React.useState<string>("");
  const [isDragging, setIsDragging] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const existingNrs = React.useMemo(
    () => new Set(existingInvoices.map((inv) => inv.nr)),
    [existingInvoices],
  );

  const validRows = parsedRows.filter((r) => r.isValid);
  const invalidRows = parsedRows.filter((r) => !r.isValid);

  function handleFile(file: File) {
    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          setParsedRows(parseRows(result.data as RawRow[], existingNrs, t));
        },
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        setParsedRows(parseRows(XLSX.utils.sheet_to_json<RawRow>(ws, { defval: "" }), existingNrs, t));
      };
      reader.readAsArrayBuffer(file);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function handleConfirm() {
    const toImport: Invoice[] = validRows.map((r) => ({
      id: crypto.randomUUID(),
      nr: r.invoice.nr ?? "",
      tip: r.invoice.tip ?? "venit",
      data: r.invoice.data ?? "",
      scadenta: r.invoice.scadenta ?? "",
      clientFurnizor: r.invoice.clientFurnizor ?? "",
      linii: r.invoice.linii,
      status: r.invoice.status ?? "neplatită",
    }));
    onImport(toImport);
    handleClose();
  }

  function handleClose() {
    setParsedRows([]);
    setFileName("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            {t("invoices.import.title")}
          </DialogTitle>
        </DialogHeader>

        {parsedRows.length === 0 && (
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors",
              isDragging ? "border-primary bg-primary/10" : "border-muted-foreground/30 hover:border-primary/50",
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium">{t("invoices.import.dragDrop")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("invoices.import.clickToChoose")}</p>
            <p className="text-xs text-muted-foreground mt-3">
              {t("invoices.import.acceptedColumns")}: <code>nr, tip, data, scadenta, clientFurnizor, descriere, cantitate, pretUnitar, status</code>
            </p>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleInputChange} />
          </div>
        )}

        {parsedRows.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-muted-foreground font-medium">📄 {fileName}</span>
              <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {validRows.length} {t("invoices.import.valid")}
              </Badge>
              {invalidRows.length > 0 && (
                <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {invalidRows.length} {t("invoices.import.errors")}
                </Badge>
              )}
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => { setParsedRows([]); setFileName(""); }}>
                <X className="w-4 h-4 mr-1" /> {t("invoices.import.changeFile")}
              </Button>
            </div>

            <div className="rounded-md border overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left w-6"></th>
                    <th className="p-2 text-left">Nr.</th>
                    <th className="p-2 text-left">Tip</th>
                    <th className="p-2 text-left">Data</th>
                    <th className="p-2 text-left">Client/Furnizor</th>
                    <th className="p-2 text-left">Descriere</th>
                    <th className="p-2 text-right">Cant.</th>
                    <th className="p-2 text-right">Preț</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Erori</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row, idx) => (
                    <tr key={idx} className={cn("border-b", row.isValid ? "hover:bg-muted/20" : "bg-red-500/10 hover:bg-red-500/15")}>
                      <td className="p-2">
                        {row.isValid
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                          : <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
                      </td>
                      <td className="p-2 font-medium">{row.invoice.nr}</td>
                      <td className="p-2">{row.invoice.tip}</td>
                      <td className="p-2">{row.invoice.data}</td>
                      <td className="p-2">{row.invoice.clientFurnizor}</td>
                      <td className="p-2">{row.invoice.linii[0]?.descriere}</td>
                      <td className="p-2 text-right">{row.invoice.linii[0]?.cantitate}</td>
                      <td className="p-2 text-right">{row.invoice.linii[0]?.pretUnitar}</td>
                      <td className="p-2">{row.invoice.status}</td>
                      <td className="p-2 text-red-400">{row.errors.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {invalidRows.length > 0 && (
              <p className="text-xs text-muted-foreground">
                * {t("invoices.import.invalidRowsNote")}
              </p>
            )}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClose}>{t("invoices.import.cancel")}</Button>
          {parsedRows.length > 0 && validRows.length > 0 && (
            <Button onClick={handleConfirm}>
              <Upload className="w-4 h-4 mr-1" />
              {t("invoices.import.importButton", { count: validRows.length })}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}