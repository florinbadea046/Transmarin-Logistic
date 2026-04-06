import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";

import { getCollection, setCollection, initCollection } from "../components/invoices-utils";

import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Papa from "papaparse";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trash2, Pencil, Plus, Search, CheckCircle, X } from "lucide-react";

type InvoiceType = "venit" | "cheltuială";
type InvoiceStatus = "plătită" | "neplatită" | "parțial" | "anulată";

interface InvoiceLine {
  id: string;
  descriere: string;
  cantitate: number;
  pretUnitar: number;
}

interface Invoice {
  id: string;
  nr: string;
  tip: InvoiceType;
  data: string;
  scadenta: string;
  clientFurnizor: string;
  linii: InvoiceLine[];
  status: InvoiceStatus;
}

interface FormState {
  tip: InvoiceType;
  nr: string;
  data: string;
  scadenta: string;
  clientFurnizor: string;
  linii: InvoiceLine[];
  status: InvoiceStatus;
}

const FURNIZORI = ["SC Alpha SRL", "SC Beta SRL", "SC Gamma SA", "SC Delta SRL", "SC Epsilon SRL"];

const statusColor: Record<InvoiceStatus, string> = {
  plătită:   "bg-green-500/20 text-green-400 border-green-500/30",
  neplatită: "bg-red-500/20 text-red-400 border-red-500/30",
  parțial:   "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  anulată:   "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const generateNr = (tip: InvoiceType) => {
  const prefix = tip === "venit" ? "FACT" : "CHELT";
  return `${prefix}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;
};

const calcLineTotals = (linii: InvoiceLine[]) => {
  const totalFaraTVA = linii.reduce((sum, l) => sum + l.cantitate * l.pretUnitar, 0);
  const tva = totalFaraTVA * 0.19;
  return { totalFaraTVA, tva, total: totalFaraTVA + tva };
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON" }).format(amount);

const emptyLine = (): InvoiceLine => ({
  id: crypto.randomUUID(),
  descriere: "",
  cantitate: 1,
  pretUnitar: 0,
});

const defaultForm = (): FormState => ({
  tip: "venit",
  nr: generateNr("venit"),
  data: new Date().toISOString().slice(0, 10),
  scadenta: "",
  clientFurnizor: FURNIZORI[0],
  linii: [emptyLine()],
  status: "neplatită",
});

const initialMock: Invoice[] = [
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


type ExportRow = {
  [key: string]: string
}

function getExportRows(invoices: Invoice[], t: (key: string) => string): ExportRow[] {
  return invoices.map((inv) => {
    const { totalFaraTVA, tva, total } = calcLineTotals(inv.linii)

    return {
      [t("invoices.columns.nr")]: inv.nr,
      [t("invoices.columns.clientSupplier")]: inv.clientFurnizor,
      [t("invoices.columns.type")]: inv.tip === "venit" ? t("invoices.typeLabels.income") : t("invoices.typeLabels.expense"),
      [t("invoices.columns.date")]: inv.data,
      [t("invoices.columns.subtotal")]: totalFaraTVA.toFixed(2),
      [t("invoices.columns.vat")]: tva.toFixed(2),
      [t("invoices.columns.total")]: total.toFixed(2),
      [t("invoices.columns.status")]: t(`invoices.statusLabels.${inv.status}`),
    }
  })
}

function exportPDF(invoices: Invoice[], t: (key: string) => string) {
  const doc = new jsPDF()

  doc.setFontSize(16)
  doc.text(t("invoices.header"), 14, 16)

  doc.setFontSize(11)
  doc.text(`${t("invoices.export.invoiceList")} [${new Date().toLocaleDateString("ro-RO")}]`, 14, 24)

  const rows = getExportRows(invoices, t)

  const cols = Object.keys(rows[0] ?? {})

  autoTable(doc, {
    head: [cols],
    body: rows.map((r) => cols.map((c) => r[c])),
    startY: 30,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 30, 30] },
  })

  doc.save("facturi.pdf")
}

function exportExcel(invoices: Invoice[], t: (key: string) => string) {
  const rows = getExportRows(invoices, t)

  const ws = XLSX.utils.json_to_sheet(rows)

  const wb = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(wb, ws, t("invoices.title"))

  XLSX.writeFile(wb, "facturi.xlsx")
}

function exportCSV(invoices: Invoice[], t: (key: string) => string) {
  const rows = getExportRows(invoices, t)

  const csv = Papa.unparse(rows)

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })

  const url = URL.createObjectURL(blob)

  const a = document.createElement("a")

  a.href = url
  a.download = "facturi.csv"

  a.click()

  URL.revokeObjectURL(url)
}

function ExportMenu({
  invoices,
  selectedIds,
  filteredInvoices,
}: {
  invoices: Invoice[];
  selectedIds: Set<string>;
  filteredInvoices: Invoice[];
}) {
  const { t } = useTranslation();

  const toExport = selectedIds.size > 0
    ? invoices.filter((inv) => selectedIds.has(inv.id))
    : filteredInvoices;

  const label = selectedIds.size > 0
    ? `${t("invoices.export.export")} (${selectedIds.size})`
    : t("invoices.export.export");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={selectedIds.size > 0 ? "border-blue-500 text-blue-400" : ""}>
          <Download className="w-4 h-4 mr-1" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {selectedIds.size > 0 && (
          <>
            <div className="px-2 py-1 text-xs text-muted-foreground font-medium">
              {t("invoices.selection.count", { count: selectedIds.size })}
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => { exportPDF(toExport, t); toast.success(t("invoices.export.pdfSuccess")); }}
        >
          {t("invoices.export.pdf")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => { exportExcel(toExport, t); toast.success(t("invoices.export.excelSuccess")); }}
        >
          {t("invoices.export.excel")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => { exportCSV(toExport, t); toast.success(t("invoices.export.csvSuccess")); }}
        >
          {t("invoices.export.csv")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function InvoiceCard({
  inv, onEdit, onDelete, onMarkPaid, selected, onSelect,
}: {
  inv: Invoice;
  onEdit: (inv: Invoice) => void;
  onDelete: (id: string) => void;
  onMarkPaid: (id: string) => void;
  selected: boolean;
  onSelect: (id: string, checked: boolean) => void;
}) {
  const { t } = useTranslation();
  const { totalFaraTVA, tva, total } = calcLineTotals(inv.linii);

  // Mapare status
  const statusMap: Record<string, InvoiceData["status"]> = {
    "plătită":  "paid",
    "neplatită": "overdue",
    "parțial":  "sent",
    "anulată":  "cancelled",
  };

  return {
    invoiceNumber: inv.nr,
    invoiceDate:   inv.data,
    dueDate:       inv.scadenta,
    status:        statusMap[inv.status] ?? "draft",
    clientName:    inv.clientFurnizor,
    lineItems: inv.linii.map((l) => ({
      description: l.descriere,
      quantity:    l.cantitate,
      unitPrice:   l.pretUnitar,
      vatRate:     19,
    })),
    // Câmpuri calculate (opționale – folosite în secțiunea totale)
    paymentTerms: `Subtotal: ${formatCurrency(totalFaraTVA)} | TVA: ${formatCurrency(tva)} | Total: ${formatCurrency(total)}`,
  };
}

export default function InvoicesPage() {
  const { t } = useTranslation();

  const [invoices, setInvoices] = useState<Invoice[]>(() => getCollection(initialMock));
  const [tipFilter, setTipFilter] = useState("toate");
  const [statusFilter, setStatusFilter] = useState("toate");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    initCollection(initialMock);
  }, []);

  useEffect(() => {
    setCollection(invoices);
  }, [invoices]);

  const filtered = useMemo(() => {

    const q = search.toLowerCase();
    return invoices.filter((inv) => {
      const matchTip = tipFilter === "toate" || inv.tip === tipFilter;
      const matchStatus = statusFilter === "toate" || inv.status === statusFilter;
      const matchSearch = !q || inv.nr.toLowerCase().includes(q) || inv.clientFurnizor.toLowerCase().includes(q) || inv.tip.toLowerCase().includes(q) || inv.status.toLowerCase().includes(q);
      return matchTip && matchStatus && matchSearch;
    });
  }, [invoices, tipFilter, statusFilter, search]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((inv) => selectedIds.has(inv.id));
  const someFilteredSelected = filtered.some((inv) => selectedIds.has(inv.id));

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filtered.forEach((inv) => (checked ? next.add(inv.id) : next.delete(inv.id)));
      return next;
    });
  };

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const isOverdue = (inv: Invoice) => {
    if (inv.status === "plătită" || inv.status === "anulată") return false;
    return inv.scadenta ? new Date(inv.scadenta) < new Date() : false;
  };

  const openNew = () => {
    setEditId(null);
    setForm(defaultForm());
    setDialogOpen(true);
  };

  const openEdit = (inv: Invoice) => {
    setEditId(inv.id);
    setForm({ tip: inv.tip, nr: inv.nr, data: inv.data, scadenta: inv.scadenta, clientFurnizor: inv.clientFurnizor, linii: inv.linii.map((l) => ({ ...l })), status: inv.status });
    setDialogOpen(true);
  };

  const handleSave = () => {
    // ← ADĂUGAT: validare factură fără articole
    if (form.linii.length === 0 || form.linii.every((l) => !l.descriere.trim())) {
      toast.error("Factura trebuie să conțină cel puțin un articol cu descriere");
      return;
    }

    if (editId) {
      setInvoices((prev) => prev.map((inv) => (inv.id === editId ? { ...inv, ...form } : inv)));
      toast.success("Factură actualizată cu succes");
    } else {
      setInvoices((prev) => [...prev, { id: crypto.randomUUID(), ...form }]);
      toast.success("Factură adăugată cu succes");
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== deleteId));
    setDeleteId(null);
    toast.success("Factură ștearsă"); // ← ADĂUGAT
  };

  const handleMarkPaid = (id: string) => {
    setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, status: "plătită" } : inv)));
    toast.success("Factură marcată ca plătită"); // ← ADĂUGAT
  };

  const updateLine = (idx: number, field: keyof InvoiceLine, value: string | number) => {
    setForm((prev) => {
      const linii = [...prev.linii];
      linii[idx] = { ...linii[idx], [field]: value };
      return { ...prev, linii };
    });
  };

  const addLine = () => setForm((prev) => ({ ...prev, linii: [...prev.linii, emptyLine()] }));
  const removeLine = (idx: number) => setForm((prev) => ({ ...prev, linii: prev.linii.filter((_, i) => i !== idx) }));
  const totals = calcLineTotals(form.linii);

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("invoices.title")}</h1>
      </Header>

      <Main>
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle>{t("invoices.cardTitle")}</CardTitle>
            <div className="flex gap-2 flex-wrap justify-end">
              <ExportMenu invoices={invoices} selectedIds={selectedIds} filteredInvoices={filtered} />
              <Button size="sm" onClick={openNew} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-1" /> {t("invoices.actions.add")}
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <div className="flex flex-col gap-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9" placeholder={t("invoices.filters.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={tipFilter} onValueChange={setTipFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder={t("invoices.filters.allTypes")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="toate">{t("invoices.filters.allTypes")}</SelectItem>
                    <SelectItem value="venit">{t("invoices.typeLabels.income")}</SelectItem>
                    <SelectItem value="cheltuială">{t("invoices.typeLabels.expense")}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder={t("invoices.filters.allStatuses")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="toate">{t("invoices.filters.allStatuses")}</SelectItem>
                    <SelectItem value="plătită">{t("invoices.statusLabels.plătită")}</SelectItem>
                    <SelectItem value="neplatită">{t("invoices.statusLabels.neplatită")}</SelectItem>
                    <SelectItem value="parțial">{t("invoices.statusLabels.parțial")}</SelectItem>
                    <SelectItem value="anulată">{t("invoices.statusLabels.anulată")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {someFilteredSelected && (
              <div className="flex items-center justify-between rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2 mb-3 text-sm">
                <span className="text-blue-400 font-medium">{t("invoices.selection.count", { count: selectedIds.size })}</span>
                <Button size="sm" variant="ghost" className="h-7 text-muted-foreground hover:text-white" onClick={clearSelection}>
                  <X className="w-3 h-3 mr-1" /> {t("invoices.actions.deselect")}
                </Button>
              </div>
            )}

            <div className="flex flex-col gap-3 md:hidden">
              {filtered.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{t("invoices.noResults")}</p>
              ) : (
                filtered.map((inv) => (
                  <InvoiceCard
                    key={inv.id}
                    inv={inv}
                    onEdit={openEdit}
                    onDelete={(id) => setDeleteId(id)}
                    onMarkPaid={handleMarkPaid}
                    selected={selectedIds.has(inv.id)}
                    onSelect={toggleSelect}
                  />
                ))
              )}
            </div>

            <div className="hidden md:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox checked={allFilteredSelected} data-state={someFilteredSelected && !allFilteredSelected ? "indeterminate" : undefined} onCheckedChange={(checked) => toggleSelectAll(!!checked)} aria-label={t("invoices.actions.selectAll")} />
                    </TableHead>
                    <TableHead>{t("invoices.columns.nr")}</TableHead>
                    <TableHead>{t("invoices.columns.type")}</TableHead>
                    <TableHead>{t("invoices.columns.date")}</TableHead>
                    <TableHead>{t("invoices.columns.dueDate")}</TableHead>
                    <TableHead>{t("invoices.columns.clientSupplier")}</TableHead>
                    <TableHead className="text-right">{t("invoices.columns.subtotal")}</TableHead>
                    <TableHead className="text-right">{t("invoices.columns.vat")}</TableHead>
                    <TableHead className="text-right">{t("invoices.columns.total")}</TableHead>
                    <TableHead>{t("invoices.columns.status")}</TableHead>
                    <TableHead className="text-right">{t("invoices.columns.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                        {t("invoices.noResults")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((inv) => {
                      const { totalFaraTVA, tva, total } = calcLineTotals(inv.linii);
                      const overdue = isOverdue(inv);
                      const selected = selectedIds.has(inv.id);
                      return (
                        <TableRow key={inv.id} className={selected ? "bg-blue-500/10 hover:bg-blue-500/15" : overdue ? "bg-red-500/10 hover:bg-red-500/20" : ""}>
                          <TableCell>
                            <Checkbox checked={selected} onCheckedChange={(checked) => toggleSelect(inv.id, !!checked)} />
                          </TableCell>
                          <TableCell className="font-medium">{inv.nr}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={inv.tip === "venit" ? "border-blue-500/30 text-blue-400" : "border-orange-500/30 text-orange-400"}>
                              {inv.tip === "venit" ? t("invoices.typeLabels.income") : t("invoices.typeLabels.expense")}
                            </Badge>
                          </TableCell>
                          <TableCell>{inv.data}</TableCell>
                          <TableCell className={overdue && !selected ? "text-red-400 font-semibold" : ""}>{inv.scadenta}</TableCell>
                          <TableCell>{inv.clientFurnizor}</TableCell>
                          <TableCell className="text-right">{formatCurrency(totalFaraTVA)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(tva)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(total)}</TableCell>
                          <TableCell>
                            <Badge className={`border ${statusColor[inv.status]}`}>{t(`invoices.statusLabels.${inv.status}`)}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {/* ── D15: Buton PDF ── */}
                              <InvoicePDFButton
                                invoice={toInvoiceData(inv)}
                                size="icon"
                                variant="ghost"
                              />
                              {(inv.status === "neplatită" || inv.status === "parțial") && (
                                <Button size="icon" variant="ghost" className="text-green-400 hover:text-green-300" title={t("invoices.actions.markPaid")} onClick={() => handleMarkPaid(inv.id)}>
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              )}
                              <Button size="icon" variant="ghost" onClick={() => openEdit(inv)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-300" disabled={inv.status === "plătită"} onClick={() => setDeleteId(inv.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end mt-4 text-sm text-muted-foreground">{t("invoices.pagination.showing", { filtered: filtered.length, total: invoices.length })}</div>
          </CardContent>
        </Card>
      </Main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? t("invoices.form.editTitle") : t("invoices.form.addTitle")}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1">
              <Label>{t("invoices.form.type")}</Label>
              <Select value={form.tip} onValueChange={(v) => setForm((prev) => ({ ...prev, tip: v as InvoiceType, nr: editId ? prev.nr : generateNr(v as InvoiceType) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="venit">{t("invoices.typeLabels.income")}</SelectItem>
                  <SelectItem value="cheltuială">{t("invoices.typeLabels.expense")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("invoices.form.invoiceNrAuto")}</Label>
              <Input value={form.nr} readOnly className="bg-muted" />
            </div>
            <div className="space-y-1">
              <Label>{t("invoices.form.date")}</Label>
              <Input type="date" value={form.data} onChange={(e) => setForm((prev) => ({ ...prev, data: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>{t("invoices.form.dueDate")}</Label>
              <Input type="date" value={form.scadenta} onChange={(e) => setForm((prev) => ({ ...prev, scadenta: e.target.value }))} />
            </div>
            <div className="space-y-1 col-span-1 sm:col-span-2">
              <Label>{t("invoices.form.clientSupplier")}</Label>
              <Select value={form.clientFurnizor} onValueChange={(v) => setForm((prev) => ({ ...prev, clientFurnizor: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FURNIZORI.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1 col-span-1 sm:col-span-2">
              <Label>{t("invoices.form.status")}</Label>
              <Select value={form.status} onValueChange={(v) => setForm((prev) => ({ ...prev, status: v as InvoiceStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="neplatită">{t("invoices.statusLabels.neplatită")}</SelectItem>
                  <SelectItem value="parțial">{t("invoices.statusLabels.parțial")}</SelectItem>
                  <SelectItem value="plătită">{t("invoices.statusLabels.plătită")}</SelectItem>
                  <SelectItem value="anulată">{t("invoices.statusLabels.anulată")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-base">{t("invoices.form.items")}</Label>
              <Button size="sm" variant="outline" onClick={addLine}><Plus className="w-3 h-3 mr-1" /> {t("invoices.form.addLine")}</Button>
            </div>
            <div className="flex flex-col gap-3 sm:hidden">
              {form.linii.map((linie, idx) => (
                <div key={linie.id} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{t("invoices.form.itemNumber", { number: idx + 1 })}</span>
                    <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-300 h-6 w-6" disabled={form.linii.length === 1} onClick={() => removeLine(idx)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("invoices.form.description")}</Label>
                    <Input value={linie.descriere} placeholder={t("invoices.form.descriptionPlaceholder")} onChange={(e) => updateLine(idx, "descriere", e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">{t("invoices.form.quantity")}</Label>
                      <Input type="number" min={1} value={linie.cantitate} onChange={(e) => updateLine(idx, "cantitate", Number(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t("invoices.form.unitPrice")}</Label>
                      <Input type="number" min={0} value={linie.pretUnitar} onChange={(e) => updateLine(idx, "pretUnitar", Number(e.target.value))} />
                    </div>
                  </div>
                  <div className="flex justify-end text-sm font-semibold">{t("invoices.columns.total")}: {formatCurrency(linie.cantitate * linie.pretUnitar)}</div>
                </div>
              ))}
            </div>
            <div className="hidden sm:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("invoices.form.description")}</TableHead>
                    <TableHead className="w-24">{t("invoices.form.quantity")}</TableHead>
                    <TableHead className="w-32">{t("invoices.form.unitPrice")}</TableHead>
                    <TableHead className="w-32 text-right">{t("invoices.form.lineTotal")}</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {form.linii.map((linie, idx) => (
                    <TableRow key={linie.id}>
                      <TableCell><Input value={linie.descriere} placeholder={t("invoices.form.descriptionPlaceholder")} onChange={(e) => updateLine(idx, "descriere", e.target.value)} /></TableCell>
                      <TableCell><Input type="number" min={1} value={linie.cantitate} onChange={(e) => updateLine(idx, "cantitate", Number(e.target.value))} /></TableCell>
                      <TableCell><Input type="number" min={0} value={linie.pretUnitar} onChange={(e) => updateLine(idx, "pretUnitar", Number(e.target.value))} /></TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(linie.cantitate * linie.pretUnitar)}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-300" disabled={form.linii.length === 1} onClick={() => removeLine(idx)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-col items-end gap-1 text-sm pr-2">
              <div className="flex gap-4 sm:gap-8">
                <span className="text-muted-foreground">{t("invoices.totals.subtotal")}:</span>
                <span className="font-medium w-28 sm:w-32 text-right">{formatCurrency(totals.totalFaraTVA)}</span>
              </div>
              <div className="flex gap-4 sm:gap-8">
                <span className="text-muted-foreground">{t("invoices.totals.vat")}:</span>
                <span className="font-medium w-28 sm:w-32 text-right">{formatCurrency(totals.tva)}</span>
              </div>
              <div className="flex gap-4 sm:gap-8 text-base">
                <span className="font-semibold">{t("invoices.totals.total")}:</span>
                <span className="font-bold w-28 sm:w-32 text-right">{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setDialogOpen(false)}>{t("invoices.actions.cancel")}</Button>
            <Button className="w-full sm:w-auto" onClick={handleSave}>{editId ? t("invoices.actions.saveChanges") : t("invoices.actions.addInvoice")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("invoices.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("invoices.deleteDialog.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">{t("invoices.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction className="w-full sm:w-auto bg-red-600 hover:bg-red-700" onClick={handleDelete}>
              {t("invoices.actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}