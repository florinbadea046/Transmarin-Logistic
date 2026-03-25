import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Invoice } from "@/modules/accounting/types";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
  }).format(value);
};

const invoiceStatusLabel = (status: string) => {
  switch (status) {
    case "paid":
      return "Plătită";
    case "pending":
      return "În așteptare";
    default:
      return status;
  }
};

function DatePicker({ date, onSelect, placeholder }: { date: Date | undefined; onSelect: (d: Date | undefined) => void; placeholder: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  useEffect(() => {
    setInvoices(getCollection<Invoice>(STORAGE_KEYS.invoices));
  }, []);

  const filtered = useMemo(() => {
    const startStr = startDate ? format(startDate, "yyyy-MM-dd") : "";
    const endStr = endDate ? format(endDate, "yyyy-MM-dd") : "";

    return invoices.filter((inv) => {
      if (startStr && inv.date < startStr) return false;
      if (endStr && inv.date > endStr) return false;
      return true;
    });
  }, [invoices, startDate, endDate]);

  const totalVenituri = useMemo(() => filtered.filter((i) => i.type === "income").reduce((sum, i) => sum + i.total, 0), [filtered]);

  const totalCheltuieli = useMemo(() => filtered.filter((i) => i.type === "expense").reduce((sum, i) => sum + i.total, 0), [filtered]);

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
        <h1 className="text-lg font-semibold">Rapoarte Financiare</h1>
      </Header>

      <Main className="space-y-4">
        {/* FILTRE */}
        <Card>
          <CardHeader>
            <CardTitle>Filtre</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>De la</Label>
              <DatePicker date={startDate} onSelect={setStartDate} placeholder="Alege data..." />
            </div>
            <div className="space-y-1">
              <Label>Până la</Label>
              <DatePicker date={endDate} onSelect={setEndDate} placeholder="Alege data..." />
            </div>
          </CardContent>
        </Card>

        {/* KPI */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Venituri</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-500">{formatCurrency(totalVenituri)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Cheltuieli</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-500">{formatCurrency(totalCheltuieli)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Balanță</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${balanta >= 0 ? "text-green-500" : "text-red-500"}`}>{formatCurrency(balanta)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Nr. Facturi</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{filtered.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* BREAKDOWN + TABEL */}
        <Card>
          <CardHeader>
            <CardTitle>Breakdown pe luni</CardTitle>
          </CardHeader>

          <CardContent>
            {/* Desktop */}
            <div className="hidden md:block rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lună</TableHead>
                    <TableHead className="text-right">Venituri</TableHead>
                    <TableHead className="text-right">Cheltuieli</TableHead>
                    <TableHead className="text-right">Balanță</TableHead>
                    <TableHead className="text-right">Nr. Facturi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breakdown.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        Niciun rezultat
                      </TableCell>
                    </TableRow>
                  ) : (
                    breakdown.map((row) => (
                      <TableRow key={row.luna}>
                        <TableCell>{row.luna}</TableCell>
                        <TableCell className="text-right text-green-500">{formatCurrency(row.venituri)}</TableCell>
                        <TableCell className="text-right text-red-500">{formatCurrency(row.cheltuieli)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(row.venituri - row.cheltuieli)}</TableCell>
                        <TableCell className="text-right">{row.nrFacturi}</TableCell>
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
                  <div>Venituri: {formatCurrency(row.venituri)}</div>
                  <div>Cheltuieli: {formatCurrency(row.cheltuieli)}</div>
                </div>
              ))}
            </div>

            {/* FACTURI */}
            <div className="mt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nr. Factură</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Dată</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>{inv.number}</TableCell>
                      <TableCell>{inv.type === "income" ? "Venit" : "Cheltuială"}</TableCell>
                      <TableCell>{inv.clientName}</TableCell>
                      <TableCell>{inv.date}</TableCell>
                      <TableCell>{formatCurrency(inv.total)}</TableCell>
                      <TableCell>{invoiceStatusLabel(inv.status)}</TableCell>
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
