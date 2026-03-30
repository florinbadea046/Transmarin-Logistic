import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Pencil, CheckCircle } from "lucide-react";

import type { Invoice } from "./invoices-types";
import { statusColor } from "./invoices-types";
import { calcLineTotals, formatCurrency } from "./invoices-utils";

// ── Mobile Invoice Card ───────────────────────────────────────────────────────
export function InvoiceCard({
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
  const overdue = inv.status !== "plătită" && inv.status !== "anulată" && inv.scadenta
    ? new Date(inv.scadenta) < new Date()
    : false;

  return (
    <div className={`rounded-lg border p-4 space-y-3 transition-colors ${selected ? "border-blue-500/50 bg-blue-500/5" : overdue ? "border-red-500/50 bg-red-500/5" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelect(inv.id, !!checked)}
          />
          <div>
            <p className="font-semibold text-sm">{inv.nr}</p>
            <p className="text-xs text-muted-foreground">{inv.clientFurnizor}</p>
          </div>
        </div>
        <Badge className={`border ${statusColor[inv.status]} shrink-0`}>
          {t(`invoices.statusLabels.${inv.status}`)}
        </Badge>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Badge variant="outline" className={inv.tip === "venit" ? "border-blue-500/30 text-blue-400" : "border-orange-500/30 text-orange-400"}>
          {inv.tip === "venit" ? t("invoices.typeLabels.income") : t("invoices.typeLabels.expense")}
        </Badge>
        <span className="text-xs text-muted-foreground">{t("invoices.columns.date")}: {inv.data}</span>
        <span className={`text-xs ${overdue ? "text-red-400 font-semibold" : "text-muted-foreground"}`}>
          {t("invoices.columns.dueDate")}: {inv.scadenta}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm border-t pt-2">
        <div>
          <p className="text-xs text-muted-foreground">{t("invoices.columns.subtotal")}</p>
          <p className="font-medium">{formatCurrency(totalFaraTVA)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t("invoices.columns.vat")}</p>
          <p className="font-medium">{formatCurrency(tva)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t("invoices.columns.total")}</p>
          <p className="font-bold">{formatCurrency(total)}</p>
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t pt-2 flex-wrap">
        {(inv.status === "neplatită" || inv.status === "parțial") && (
          <Button size="sm" variant="ghost" className="text-green-400 hover:text-green-300" onClick={() => onMarkPaid(inv.id)}>
            <CheckCircle className="w-4 h-4 mr-1" /> {t("invoices.actions.markPaid")}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => onEdit(inv)}>
          <Pencil className="w-4 h-4 mr-1" /> {t("invoices.actions.edit")}
        </Button>
        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" disabled={inv.status === "plătită"} onClick={() => onDelete(inv.id)}>
          <Trash2 className="w-4 h-4 mr-1" /> {t("invoices.actions.delete")}
        </Button>
      </div>
    </div>
  );
}
