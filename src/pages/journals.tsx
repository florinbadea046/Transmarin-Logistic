import { useState, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Invoice } from "@/modules/accounting/types";

const formatCurrency = (n: number) => new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON", maximumFractionDigits: 2 }).format(n);

const MONTHS = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];

export default function JournalsPage() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth()));
  const [selectedYear] = useState(now.getFullYear());

  const invoices = useMemo(() => getCollection<Invoice>(STORAGE_KEYS.invoices), []);

  const filtered = useMemo(() => {
    const month = parseInt(selectedMonth);
    return invoices.filter((inv) => {
      const [year, m] = inv.date.split("-").map(Number);
      return year === selectedYear && m - 1 === month;
    });
  }, [invoices, selectedMonth, selectedYear]);

  const vanzari = filtered.filter((inv) => inv.type === "income");
  const cumparari = filtered.filter((inv) => inv.type === "expense");

  // KPI-uri
  const totalBazaVanzari = vanzari.reduce((s, inv) => s + inv.totalWithoutVAT, 0);
  const totalTVAColectat = vanzari.reduce((s, inv) => s + inv.vat, 0);
  const totalBazaCumparari = cumparari.reduce((s, inv) => s + inv.totalWithoutVAT, 0);
  const totalTVADeductibil = cumparari.reduce((s, inv) => s + inv.vat, 0);

  // Export PDF
  const exportPDF = (type: "vanzari" | "cumparari") => {
    const data = type === "vanzari" ? vanzari : cumparari;
    const title = type === "vanzari" ? "Jurnal Vanzari" : "Jurnal Cumparari";
    const luna = `${MONTHS[parseInt(selectedMonth)]} ${selectedYear}`;

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Transmarin Logistic SRL", 14, 15);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`${title} - ${luna}`, 14, 23);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Generat: ${new Date().toLocaleDateString("ro-RO")}`, 14, 29);
    doc.setTextColor(0);

    autoTable(doc, {
      startY: 34,
      head: [["Nr. Factura", "Data", type === "vanzari" ? "Client" : "Furnizor", "Baza", "TVA 19%", "Total"]],
      body: data.map((inv) => [inv.number, inv.date, inv.clientName, formatCurrency(inv.totalWithoutVAT), formatCurrency(inv.vat), formatCurrency(inv.total)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 64, 175] },
    });

    doc.save(`${title}-${luna}.pdf`);
    toast.success(`${title} exportat PDF`);
  };

  // Export Excel
  const exportExcel = (type: "vanzari" | "cumparari") => {
    const data = type === "vanzari" ? vanzari : cumparari;
    const title = type === "vanzari" ? "Jurnal Vanzari" : "Jurnal Cumparari";
    const luna = `${MONTHS[parseInt(selectedMonth)]} ${selectedYear}`;

    const wsData = [["Transmarin Logistic SRL"], [`${title} - ${luna}`], [], ["Nr. Factura", "Data", type === "vanzari" ? "Client" : "Furnizor", "Baza", "TVA 19%", "Total"], ...data.map((inv) => [inv.number, inv.date, inv.clientName, inv.totalWithoutVAT, inv.vat, inv.total])];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title);
    XLSX.writeFile(wb, `${title}-${luna}.xlsx`);
    toast.success(`${title} exportat Excel`);
  };

  const JournalTable = ({ data, type }: { data: Invoice[]; type: "vanzari" | "cumparari" }) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nr. Factura</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>{type === "vanzari" ? "Client" : "Furnizor"}</TableHead>
            <TableHead className="text-right">Baza Impozabila</TableHead>
            <TableHead className="text-right">TVA 19%</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                Nu exista facturi pentru luna selectata.
              </TableCell>
            </TableRow>
          ) : (
            data.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">{inv.number}</TableCell>
                <TableCell>{inv.date}</TableCell>
                <TableCell>{inv.clientName}</TableCell>
                <TableCell className="text-right">{formatCurrency(inv.totalWithoutVAT)}</TableCell>
                <TableCell className="text-right">{formatCurrency(inv.vat)}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(inv.total)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Jurnale Contabile</h1>
      </Header>

      <Main className="space-y-6">
        {/* Selector luna */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Luna:</span>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={String(i)}>
                  {m} {selectedYear}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Baza Vanzari</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-green-500">{formatCurrency(totalBazaVanzari)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">TVA Colectat</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-green-400">{formatCurrency(totalTVAColectat)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Baza Cumparari</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-red-500">{formatCurrency(totalBazaCumparari)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">TVA Deductibil</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-red-400">{formatCurrency(totalTVADeductibil)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="vanzari">
          <TabsList>
            <TabsTrigger value="vanzari">Jurnal Vanzari ({vanzari.length})</TabsTrigger>
            <TabsTrigger value="cumparari">Jurnal Cumparari ({cumparari.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="vanzari" className="space-y-3">
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => exportPDF("vanzari")}>
                <Download className="w-4 h-4 mr-1" /> PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportExcel("vanzari")}>
                <Download className="w-4 h-4 mr-1" /> Excel
              </Button>
            </div>
            <JournalTable data={vanzari} type="vanzari" />
          </TabsContent>

          <TabsContent value="cumparari" className="space-y-3">
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => exportPDF("cumparari")}>
                <Download className="w-4 h-4 mr-1" /> PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportExcel("cumparari")}>
                <Download className="w-4 h-4 mr-1" /> Excel
              </Button>
            </div>
            <JournalTable data={cumparari} type="cumparari" />
          </TabsContent>
        </Tabs>
      </Main>
    </>
  );
}
