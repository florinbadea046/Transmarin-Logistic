import { useState, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Search } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
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

// ── Constants ─────────────────────────────────────────────────────────────────
const statusColor: Record<InvoiceStatus, string> = {
  plătită:   "bg-green-500/20 text-green-400 border-green-500/30",
  neplatită: "bg-red-500/20 text-red-400 border-red-500/30",
  parțial:   "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  anulată:   "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const statusLabels: Record<InvoiceStatus, string> = {
  plătită: "Plătită",
  neplatită: "Neplătită",
  parțial: "Parțial",
  anulată: "Anulată",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const calcLineTotals = (linii: InvoiceLine[]) => {
  const totalFaraTVA = linii.reduce((sum, l) => sum + l.cantitate * l.pretUnitar, 0);
  const tva = totalFaraTVA * 0.19;
  return { totalFaraTVA, tva, total: totalFaraTVA + tva };
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON" }).format(amount);

// ── Mock Data ─────────────────────────────────────────────────────────────────
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

// ── Mobile Invoice Card ───────────────────────────────────────────────────────
function InvoiceCard({ inv }: { inv: Invoice }) {
  const { totalFaraTVA, tva, total } = calcLineTotals(inv.linii);

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm">{inv.nr}</p>
          <p className="text-xs text-muted-foreground">{inv.clientFurnizor}</p>
        </div>
        <Badge className={`border ${statusColor[inv.status]} shrink-0`}>
          {statusLabels[inv.status]}
        </Badge>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Badge
          variant="outline"
          className={inv.tip === "venit" ? "border-blue-500/30 text-blue-400" : "border-orange-500/30 text-orange-400"}
        >
          {inv.tip === "venit" ? "Venit" : "Cheltuială"}
        </Badge>
        <span className="text-xs text-muted-foreground">Dată: {inv.data}</span>
        <span className="text-xs text-muted-foreground">Scadență: {inv.scadenta}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm border-t pt-2">
        <div>
          <p className="text-xs text-muted-foreground">Fără TVA</p>
          <p className="font-medium">{formatCurrency(totalFaraTVA)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">TVA</p>
          <p className="font-medium">{formatCurrency(tva)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="font-bold">{formatCurrency(total)}</p>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function InvoicesPage() {
  const [invoices] = useState<Invoice[]>(initialMock);
  const [tipFilter, setTipFilter] = useState("toate");
  const [statusFilter, setStatusFilter] = useState("toate");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return invoices.filter((inv) => {
      const matchTip = tipFilter === "toate" || inv.tip === tipFilter;
      const matchStatus = statusFilter === "toate" || inv.status === statusFilter;
      const matchSearch =
        !q ||
        inv.nr.toLowerCase().includes(q) ||
        inv.clientFurnizor.toLowerCase().includes(q) ||
        inv.tip.toLowerCase().includes(q) ||
        inv.status.toLowerCase().includes(q);
      return matchTip && matchStatus && matchSearch;
    });
  }, [invoices, tipFilter, statusFilter, search]);

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Facturi</h1>
      </Header>

      <Main>
        <Card>
          <CardHeader>
            <CardTitle>Gestiune Facturi</CardTitle>
          </CardHeader>

          <CardContent>
            {/* Filtre */}
            <div className="flex flex-col gap-3 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Caută după număr, client, tip..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={tipFilter} onValueChange={setTipFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Toate tipurile" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="toate">Toate tipurile</SelectItem>
                    <SelectItem value="venit">Venit</SelectItem>
                    <SelectItem value="cheltuială">Cheltuială</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Toate statusurile" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="toate">Toate statusurile</SelectItem>
                    <SelectItem value="plătită">Plătită</SelectItem>
                    <SelectItem value="neplatită">Neplătită</SelectItem>
                    <SelectItem value="parțial">Parțial</SelectItem>
                    <SelectItem value="anulată">Anulată</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Mobile: carduri */}
            <div className="flex flex-col gap-3 md:hidden">
              {filtered.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nu există facturi pentru filtrele selectate.
                </p>
              ) : (
                filtered.map((inv) => <InvoiceCard key={inv.id} inv={inv} />)
              )}
            </div>

            {/* Desktop: tabel */}
            <div className="hidden md:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nr. Factură</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead>Dată</TableHead>
                    <TableHead>Scadență</TableHead>
                    <TableHead>Client / Furnizor</TableHead>
                    <TableHead className="text-right">Fără TVA</TableHead>
                    <TableHead className="text-right">TVA</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        Nu există facturi pentru filtrele selectate.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((inv) => {
                      const { totalFaraTVA, tva, total } = calcLineTotals(inv.linii);
                      return (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium">{inv.nr}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                inv.tip === "venit"
                                  ? "border-blue-500/30 text-blue-400"
                                  : "border-orange-500/30 text-orange-400"
                              }
                            >
                              {inv.tip === "venit" ? "Venit" : "Cheltuială"}
                            </Badge>
                          </TableCell>
                          <TableCell>{inv.data}</TableCell>
                          <TableCell>{inv.scadenta}</TableCell>
                          <TableCell>{inv.clientFurnizor}</TableCell>
                          <TableCell className="text-right">{formatCurrency(totalFaraTVA)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(tva)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(total)}</TableCell>
                          <TableCell>
                            <Badge className={`border ${statusColor[inv.status]}`}>
                              {statusLabels[inv.status]}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end mt-4 text-sm text-muted-foreground">
              {filtered.length} factură(i) afișată(e) din {invoices.length} total
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}