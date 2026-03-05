import { useState, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

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

interface FormState {
  tip: InvoiceType;
  nr: string;
  data: string;
  scadenta: string;
  clientFurnizor: string;
  linii: InvoiceLine[];
  status: InvoiceStatus;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const FURNIZORI = ["SC Alpha SRL", "SC Beta SRL", "SC Gamma SA", "SC Delta SRL", "SC Epsilon SRL"];

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
const generateNr = (tip: InvoiceType) => {
  const prefix = tip === "venit" ? "FACT" : "CHELT";
  return `${prefix}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;
};

const calcLineTotals = (linii: InvoiceLine[]) => {
  const totalFaraTVA = linii.reduce((sum, l) => sum + l.cantitate * l.pretUnitar, 0);
  const tva = totalFaraTVA * 0.19;
  return { totalFaraTVA, tva, total: totalFaraTVA + tva };
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON" }).format(amount);

const emptyLine = (): InvoiceLine => ({
  id: crypto.randomUUID(),
  descriere: "",
  cantitate: 1,
  pretUnitar: 0,
});

const defaultForm = (): FormState => ({
  tip: "venit",
  nr: generateNr("venit"),
  data: new Date().toISOString().slice(0, 10),
  scadenta: "",
  clientFurnizor: FURNIZORI[0],
  linii: [emptyLine()],
  status: "neplatită",
});

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
function InvoiceCard({ inv, onEdit }: { inv: Invoice; onEdit: (inv: Invoice) => void }) {
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

      <div className="flex justify-end border-t pt-2">
        <Button size="sm" variant="ghost" onClick={() => onEdit(inv)}>
          <Pencil className="w-4 h-4 mr-1" /> Editează
        </Button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>(initialMock);
  const [tipFilter, setTipFilter] = useState("toate");
  const [statusFilter, setStatusFilter] = useState("toate");
  const [search, setSearch] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm());

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

  const openNew = () => { setEditId(null); setForm(defaultForm()); setDialogOpen(true); };

  const openEdit = (inv: Invoice) => {
    setEditId(inv.id);
    setForm({
      tip: inv.tip, nr: inv.nr, data: inv.data, scadenta: inv.scadenta,
      clientFurnizor: inv.clientFurnizor,
      linii: inv.linii.map((l) => ({ ...l })),
      status: inv.status,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editId) {
      setInvoices((prev) => prev.map((inv) => (inv.id === editId ? { ...inv, ...form } : inv)));
    } else {
      setInvoices((prev) => [...prev, { id: crypto.randomUUID(), ...form }]);
    }
    setDialogOpen(false);
  };

  const updateLine = (idx: number, field: keyof InvoiceLine, value: string | number) => {
    setForm((prev) => {
      const linii = [...prev.linii];
      linii[idx] = { ...linii[idx], [field]: value };
      return { ...prev, linii };
    });
  };

  const addLine = () => setForm((prev) => ({ ...prev, linii: [...prev.linii, emptyLine()] }));
  const removeLine = (idx: number) =>
    setForm((prev) => ({ ...prev, linii: prev.linii.filter((_, i) => i !== idx) }));

  const totals = calcLineTotals(form.linii);

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Facturi</h1>
      </Header>

      <Main>
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle>Gestiune Facturi</CardTitle>
            <Button size="sm" onClick={openNew} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-1" /> Factură Nouă
            </Button>
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
                filtered.map((inv) => (
                  <InvoiceCard key={inv.id} inv={inv} onEdit={openEdit} />
                ))
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
                    <TableHead className="text-right">Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
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
                              className={inv.tip === "venit" ? "border-blue-500/30 text-blue-400" : "border-orange-500/30 text-orange-400"}
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
                          <TableCell className="text-right">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(inv)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
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

      {/* ── Dialog Adăugare / Editare ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editare Factură" : "Factură Nouă"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1">
              <Label>Tip</Label>
              <Select
                value={form.tip}
                onValueChange={(v) =>
                  setForm((prev) => ({
                    ...prev,
                    tip: v as InvoiceType,
                    nr: editId ? prev.nr : generateNr(v as InvoiceType),
                  }))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="venit">Venit</SelectItem>
                  <SelectItem value="cheltuială">Cheltuială</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Nr. Factură (auto)</Label>
              <Input value={form.nr} readOnly className="bg-muted" />
            </div>

            <div className="space-y-1">
              <Label>Dată</Label>
              <Input type="date" value={form.data}
                onChange={(e) => setForm((prev) => ({ ...prev, data: e.target.value }))} />
            </div>

            <div className="space-y-1">
              <Label>Scadență</Label>
              <Input type="date" value={form.scadenta}
                onChange={(e) => setForm((prev) => ({ ...prev, scadenta: e.target.value }))} />
            </div>

            <div className="space-y-1 col-span-1 sm:col-span-2">
              <Label>Client / Furnizor</Label>
              <Select value={form.clientFurnizor}
                onValueChange={(v) => setForm((prev) => ({ ...prev, clientFurnizor: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FURNIZORI.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 col-span-1 sm:col-span-2">
              <Label>Status</Label>
              <Select value={form.status}
                onValueChange={(v) => setForm((prev) => ({ ...prev, status: v as InvoiceStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="neplatită">Neplătită</SelectItem>
                  <SelectItem value="parțial">Parțial</SelectItem>
                  <SelectItem value="plătită">Plătită</SelectItem>
                  <SelectItem value="anulată">Anulată</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Articole */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-base">Articole</Label>
              <Button size="sm" variant="outline" onClick={addLine}>
                <Plus className="w-3 h-3 mr-1" /> Adaugă rând
              </Button>
            </div>

            {/* Mobile articole */}
            <div className="flex flex-col gap-3 sm:hidden">
              {form.linii.map((linie, idx) => (
                <div key={linie.id} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Articol #{idx + 1}</span>
                    <Button size="icon" variant="ghost"
                      className="text-red-400 hover:text-red-300 h-6 w-6"
                      disabled={form.linii.length === 1}
                      onClick={() => removeLine(idx)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Descriere</Label>
                    <Input value={linie.descriere} placeholder="Descriere serviciu/produs"
                      onChange={(e) => updateLine(idx, "descriere", e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Cantitate</Label>
                      <Input type="number" min={1} value={linie.cantitate}
                        onChange={(e) => updateLine(idx, "cantitate", Number(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Preț unitar</Label>
                      <Input type="number" min={0} value={linie.pretUnitar}
                        onChange={(e) => updateLine(idx, "pretUnitar", Number(e.target.value))} />
                    </div>
                  </div>
                  <div className="flex justify-end text-sm font-semibold">
                    Total: {formatCurrency(linie.cantitate * linie.pretUnitar)}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop articole */}
            <div className="hidden sm:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descriere</TableHead>
                    <TableHead className="w-24">Cantitate</TableHead>
                    <TableHead className="w-32">Preț unitar</TableHead>
                    <TableHead className="w-32 text-right">Total rând</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {form.linii.map((linie, idx) => (
                    <TableRow key={linie.id}>
                      <TableCell>
                        <Input value={linie.descriere} placeholder="Descriere serviciu/produs"
                          onChange={(e) => updateLine(idx, "descriere", e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min={1} value={linie.cantitate}
                          onChange={(e) => updateLine(idx, "cantitate", Number(e.target.value))} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min={0} value={linie.pretUnitar}
                          onChange={(e) => updateLine(idx, "pretUnitar", Number(e.target.value))} />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(linie.cantitate * linie.pretUnitar)}
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost"
                          className="text-red-400 hover:text-red-300"
                          disabled={form.linii.length === 1}
                          onClick={() => removeLine(idx)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Totaluri */}
            <div className="flex flex-col items-end gap-1 text-sm pr-2">
              <div className="flex gap-4 sm:gap-8">
                <span className="text-muted-foreground">Total fără TVA:</span>
                <span className="font-medium w-28 sm:w-32 text-right">{formatCurrency(totals.totalFaraTVA)}</span>
              </div>
              <div className="flex gap-4 sm:gap-8">
                <span className="text-muted-foreground">TVA (19%):</span>
                <span className="font-medium w-28 sm:w-32 text-right">{formatCurrency(totals.tva)}</span>
              </div>
              <div className="flex gap-4 sm:gap-8 text-base">
                <span className="font-semibold">Total:</span>
                <span className="font-bold w-28 sm:w-32 text-right">{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setDialogOpen(false)}>
              Anulează
            </Button>
            <Button className="w-full sm:w-auto" onClick={handleSave}>
              {editId ? "Salvează modificările" : "Adaugă factura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}