import { useTranslation } from "react-i18next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "./financial-reports-utils";

// ── FinancialKPI ──────────────────────────────────────────
export interface FinancialKPIProps {
  totalVenituri: number;
  totalCheltuieli: number;
  balanta: number;
  invoiceCount: number;
  isMobile: boolean;
}

export function FinancialKPI({
  totalVenituri,
  totalCheltuieli,
  balanta,
  invoiceCount,
  isMobile,
}: FinancialKPIProps) {
  const { t } = useTranslation();

  const cards = [
    { label: t("financialReports.totalIncome"), value: formatCurrency(totalVenituri), color: "text-green-400" },
    { label: t("financialReports.totalExpenses"), value: formatCurrency(totalCheltuieli), color: "text-red-400" },
    { label: t("financialReports.balance"), value: formatCurrency(balanta), color: balanta >= 0 ? "text-green-400" : "text-red-400" },
    { label: t("financialReports.invoiceCount"), value: invoiceCount, color: "text-foreground" },
  ];

  return (
    <div className={cn("mb-6 grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-4")}>
      {cards.map(({ label, value, color }) => (
        <Card key={label}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
