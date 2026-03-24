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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Invoice } from "@/modules/accounting/types";

function DatePicker({ date, onSelect, placeholder }: {
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
          className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "yyyy-MM-dd") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => { onSelect(d); setOpen(false); }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export default function FinancialReportsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

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

  const totalVenituri = useMemo(() =>
    filtered.filter(i => i.type === "income").reduce((sum, i) => sum + i.total, 0),
    [filtered]
  );

  const totalCheltuieli = useMemo(() =>
    filtered.filter(i => i.type === "expense").reduce((sum, i) => sum + i.total, 0),
    [filtered]
  );

  const balanta = totalVenituri - totalCheltuieli;

  const breakdown = useMemo(() => {
    const map: Record<string, { luna: string; venituri: number; cheltuieli: number; nrFacturi: number }> = {};
    filtered.forEach((inv) => {
      const luna = inv.date.substring(0, 7);
      if (!map[luna]) map[luna] = { luna, venituri: 0, cheltuieli: 0, nrFacturi: 0 };
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

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Venituri</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-500">{totalVenituri.toFixed(2)} RON</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Cheltuieli</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-500">{totalCheltuieli.toFixed(2)} RON</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Balanță</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${balanta >= 0 ? "text-green-500" : "text-red-500"}`}>
                {balanta.toFixed(2)} RON
              </p>
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

        <Card>
          <CardHeader>
            <CardTitle>Breakdown pe luni</CardTitle>
          </CardHeader>
          <CardContent>
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
                        <TableCell className="font-medium">{row.luna}</TableCell>
                        <TableCell className="text-right tabular-nums text-green-500">{row.venituri.toFixed(2)} RON</TableCell>
                        <TableCell className="text-right tabular-nums text-red-500">{row.cheltuieli.toFixed(2)} RON</TableCell>
                        <TableCell className={`text-right tabular-nums font-medium ${row.venituri - row.cheltuieli >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {(row.venituri - row.cheltuieli).toFixed(2)} RON
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{row.nrFacturi}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden space-y-3">
              {breakdown.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Niciun rezultat</p>
              ) : (
                breakdown.map((row) => (
                  <div key={row.luna} className="rounded-lg border p-4 space-y-2 text-sm">
                    <div className="font-medium text-base">{row.luna}</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2 border-t">
                      <span className="text-muted-foreground">Venituri</span>
                      <span className="tabular-nums text-green-500">{row.venituri.toFixed(2)} RON</span>
                      <span className="text-muted-foreground">Cheltuieli</span>
                      <span className="tabular-nums text-red-500">{row.cheltuieli.toFixed(2)} RON</span>
                      <span className="text-muted-foreground">Balanță</span>
                      <span className={`tabular-nums font-medium ${row.venituri - row.cheltuieli >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {(row.venituri - row.cheltuieli).toFixed(2)} RON
                      </span>
                      <span className="text-muted-foreground">Nr. Facturi</span>
                      <span className="tabular-nums">{row.nrFacturi}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}