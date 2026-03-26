import { useState, useMemo } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Invoice } from "@/modules/accounting/types";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
  }).format(value);
};

const invoiceStatusLabel = (status: string, t: (key: string) => string) => {
  switch (status) {
    case "paid":
      return t("financialReports.statusPaid");
    case "pending":
      return t("financialReports.statusPending");
    default:
      return status;
  }
};

function DatePicker({
  date,
  onSelect,
  placeholder,
}: {
  date: Date | undefined;
  onSelect: (d: Date | undefined) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "yyyy-MM-dd") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            onSelect(d);
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export default function FinancialReportsPage() {
  const { t } = useTranslation();
  const [invoices] = useState<Invoice[]>(() =>
    getCollection<Invoice>(STORAGE_KEYS.invoices),
  );
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const filtered = useMemo(() => {
    const startStr = startDate ? format(startDate, "yyyy-MM-dd") : "";
    const endStr = endDate ? format(endDate, "yyyy-MM-dd") : "";

    return invoices.filter((inv) => {
      if (startStr && inv.date < startStr) return false;
      if (endStr && inv.date > endStr) return false;
      return true;
    });
  }, [invoices, startDate, endDate]);

  const totalVenituri = useMemo(
    () =>
      filtered
        .filter((i) => i.type === "income")
        .reduce((sum, i) => sum + i.total, 0),
    [filtered],
  );

  const totalCheltuieli = useMemo(
    () =>
      filtered
        .filter((i) => i.type === "expense")
        .reduce((sum, i) => sum + i.total, 0),
    [filtered],
  );

  const balanta = totalVenituri - totalCheltuieli;

  const breakdown = useMemo(() => {
    const map: Record<
      string,
      {
        luna: string;
        venituri: number;
        cheltuieli: number;
        nrFacturi: number;
      }
    > = {};

    filtered.forEach((inv) => {
      const luna = inv.date.substring(0, 7);

      if (!map[luna]) {
        map[luna] = { luna, venituri: 0, cheltuieli: 0, nrFacturi: 0 };
      }

      if (inv.type === "income") map[luna].venituri += inv.total;
      else map[luna].cheltuieli += inv.total;

      map[luna].nrFacturi++;
    });

    return Object.values(map).sort((a, b) => b.luna.localeCompare(a.luna));
  }, [filtered]);

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("financialReports.title")}</h1>
      </Header>

      <Main className="space-y-4">
        {/* FILTRE */}
        <Card>
          <CardHeader>
            <CardTitle>{t("financialReports.filters")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t("financialReports.from")}</Label>
              <DatePicker
                date={startDate}
                onSelect={setStartDate}
                placeholder={t("financialReports.pickDate")}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("financialReports.to")}</Label>
              <DatePicker
                date={endDate}
                onSelect={setEndDate}
                placeholder={t("financialReports.pickDate")}
              />
            </div>
          </CardContent>
        </Card>

        {/* KPI */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                {t("financialReports.totalIncome")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-500">
                {formatCurrency(totalVenituri)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                {t("financialReports.totalExpenses")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-500">
                {formatCurrency(totalCheltuieli)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                {t("financialReports.balance")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={`text-2xl font-bold ${balanta >= 0 ? "text-green-500" : "text-red-500"}`}
              >
                {formatCurrency(balanta)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                {t("financialReports.invoiceCount")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{filtered.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* BREAKDOWN + TABEL */}
        <Card>
          <CardHeader>
            <CardTitle>{t("financialReports.monthlyBreakdown")}</CardTitle>
          </CardHeader>

          <CardContent>
            {/* Desktop */}
            <div className="hidden md:block rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("financialReports.month")}</TableHead>
                    <TableHead className="text-right">
                      {t("financialReports.income")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("financialReports.expenses")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("financialReports.balance")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("financialReports.invoiceCount")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breakdown.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-muted-foreground"
                      >
                        {t("financialReports.noResults")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    breakdown.map((row) => (
                      <TableRow key={row.luna}>
                        <TableCell>{row.luna}</TableCell>
                        <TableCell className="text-right text-green-500">
                          {formatCurrency(row.venituri)}
                        </TableCell>
                        <TableCell className="text-right text-red-500">
                          {formatCurrency(row.cheltuieli)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(row.venituri - row.cheltuieli)}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.nrFacturi}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile */}
            <div className="md:hidden space-y-3 mt-4">
              {breakdown.map((row) => (
                <div key={row.luna} className="border rounded-lg p-4">
                  <div className="font-medium">{row.luna}</div>
                  <div>
                    {t("financialReports.income")}:{" "}
                    {formatCurrency(row.venituri)}
                  </div>
                  <div>
                    {t("financialReports.expenses")}:{" "}
                    {formatCurrency(row.cheltuieli)}
                  </div>
                </div>
              ))}
            </div>

            {/* FACTURI */}
            <div className="mt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("financialReports.invoiceNr")}</TableHead>
                    <TableHead>{t("financialReports.type")}</TableHead>
                    <TableHead>{t("financialReports.client")}</TableHead>
                    <TableHead>{t("financialReports.date")}</TableHead>
                    <TableHead>{t("financialReports.total")}</TableHead>
                    <TableHead>{t("financialReports.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>{inv.number}</TableCell>
                      <TableCell>
                        {inv.type === "income"
                          ? t("financialReports.typeIncome")
                          : t("financialReports.typeExpense")}
                      </TableCell>
                      <TableCell>{inv.clientName}</TableCell>
                      <TableCell>{inv.date}</TableCell>
                      <TableCell>{formatCurrency(inv.total)}</TableCell>
                      <TableCell>{invoiceStatusLabel(inv.status, t)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
