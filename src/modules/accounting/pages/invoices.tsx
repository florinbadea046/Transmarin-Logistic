import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner"; // ← ADĂUGAT

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

import type { Invoice, InvoiceLine } from "./_components/invoices-types";
import { statusColor } from "./_components/invoices-types";
import { calcLineTotals, formatCurrency, emptyLine, defaultForm, initialMock } from "./_components/invoices-utils";
import { ExportMenu } from "./_components/invoices-export";
import { InvoiceCard } from "./_components/invoices-card";
import { InvoiceFormDialog } from "./_components/invoices-form-dialog";
import InvoicePDFButton from "../components/InvoicePDF"; // ← D15
import type { InvoiceData } from "../components/invoice-pdf.utils"; // ← D15

// ── Helper: mapează Invoice local → InvoiceData (pentru jsPDF) ────────────────
function toInvoiceData(inv: Invoice): InvoiceData {
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

  const [invoices, setInvoices] = useState<Invoice[]>(initialMock);
  const [tipFilter, setTipFilter] = useState("toate");
  const [statusFilter, setStatusFilter] = useState("toate");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

            {/* Mobile */}
            <div className="flex flex-col gap-3 md:hidden">{filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">{t("invoices.noResults")}</p> : filtered.map((inv) => <InvoiceCard key={inv.id} inv={inv} onEdit={openEdit} onDelete={(id) => setDeleteId(id)} onMarkPaid={handleMarkPaid} selected={selectedIds.has(inv.id)} onSelect={toggleSelect} />)}</div>

            {/* Desktop */}
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

      <InvoiceFormDialog dialogOpen={dialogOpen} setDialogOpen={setDialogOpen} editId={editId} form={form} setForm={setForm} handleSave={handleSave} updateLine={updateLine} addLine={addLine} removeLine={removeLine} totals={totals} />

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
