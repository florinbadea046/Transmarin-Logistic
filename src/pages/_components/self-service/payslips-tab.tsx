import * as React from "react";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/utils/format";
import type { Employee } from "@/modules/hr/types";
import {
  buildPayslip,
  generatePayslipPDF,
  getMonthOptions,
  loadPayslipSource,
} from "./payslip-pdf";

export function PayslipsTab({ employee }: { employee: Employee }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith("en") ? "en" : "ro";

  const rows = React.useMemo(() => {
    const source = loadPayslipSource();
    return getMonthOptions(lang).map((m) => ({
      ...m,
      payslip: buildPayslip(employee, m.value, lang, source),
    }));
  }, [employee, lang]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("hr.selfService.payslips.title")}</CardTitle>
        <CardDescription>
          {t("hr.selfService.payslips.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  {t("hr.selfService.payslips.columns.month")}
                </TableHead>
                <TableHead className="text-right">
                  {t("hr.selfService.payslips.columns.salaryBase")}
                </TableHead>
                <TableHead className="text-right">
                  {t("hr.selfService.payslips.columns.diurna")}
                </TableHead>
                <TableHead className="text-right">
                  {t("hr.selfService.payslips.columns.bonuses")}
                </TableHead>
                <TableHead className="text-right">
                  {t("hr.selfService.payslips.columns.fines")}
                </TableHead>
                <TableHead className="text-right">
                  {t("hr.selfService.payslips.columns.totalNet")}
                </TableHead>
                <TableHead className="text-right">
                  {t("hr.selfService.payslips.columns.pdf")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow
                  key={r.value}
                  className="cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onClick={() => generatePayslipPDF(r.payslip, t)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      generatePayslipPDF(r.payslip, t);
                    }
                  }}
                >
                  <TableCell className="font-medium capitalize">
                    {r.label}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(r.payslip.salaryBase)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(r.payslip.diurna)}
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    {formatCurrency(
                      r.payslip.bonusuri + r.payslip.oreSuplimentare,
                    )}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {r.payslip.amenzi > 0
                      ? `- ${formatCurrency(r.payslip.amenzi)}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(r.payslip.totalNet)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        generatePayslipPDF(r.payslip, t);
                      }}
                    >
                      <Download className="mr-1 h-4 w-4" />
                      {t("hr.selfService.payslips.downloadPdf")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
