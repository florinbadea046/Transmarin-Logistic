import type { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Trash2, Plus } from "lucide-react";

import type { InvoiceType, InvoiceStatus, InvoiceLine, FormState } from "./invoices-types";
import { FURNIZORI } from "./invoices-types";
import { generateNr, formatCurrency } from "./invoices-utils";

export function InvoiceFormDialog({
  dialogOpen,
  setDialogOpen,
  editId,
  form,
  setForm,
  handleSave,
  updateLine,
  addLine,
  removeLine,
  totals,
}: {
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  editId: string | null;
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  handleSave: () => void;
  updateLine: (idx: number, field: keyof InvoiceLine, value: string | number) => void;
  addLine: () => void;
  removeLine: (idx: number) => void;
  totals: { totalFaraTVA: number; tva: number; total: number };
}) {
  const { t } = useTranslation();

  return (
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
  );
}
