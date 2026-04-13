import { useState, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { getCollection, setCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Invoice } from "@/modules/accounting/types";

// ── Tipuri ─────────────────────────────────────────────────
export interface BudgetCategory {
  id: string;
  name: string;
  allocated: number;
}

const DEFAULT_CATEGORIES: BudgetCategory[] = [
  { id: "combustibil", name: "Combustibil", allocated: 10000 },
  { id: "salarii", name: "Salarii", allocated: 30000 },
  { id: "mentenanta", name: "Mentenanta", allocated: 5000 },
  { id: "asigurari", name: "Asigurari", allocated: 3000 },
  { id: "utilitati", name: "Utilitati", allocated: 2000 },
  { id: "altele", name: "Altele", allocated: 5000 },
];

function loadBudgets(): BudgetCategory[] {
  const saved = getCollection<BudgetCategory>(STORAGE_KEYS.budgets);
  return saved.length > 0 ? saved : DEFAULT_CATEGORIES;
}

const formatCurrency = (n: number) => new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON", maximumFractionDigits: 0 }).format(n);

// ── Componenta principală ──────────────────────────────────
export default function BudgetPage() {
  const [categories, setCategories] = useState<BudgetCategory[]>(loadBudgets);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formAllocated, setFormAllocated] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Citește facturile expense din localStorage
  const invoices = useMemo(() => getCollection<Invoice>(STORAGE_KEYS.invoices), []);

  // Calculează cheltuiala reală per categorie
  const expensePerCategory = useMemo(() => {
    const map: Record<string, number> = {};
    invoices
      .filter((inv) => inv.type === "expense")
      .forEach((inv) => {
        const cat = (inv as any).category ?? "altele";
        map[cat] = (map[cat] ?? 0) + inv.total;
      });
    return map;
  }, [invoices]);

  // Date tabel + grafic
  const rows = useMemo(
    () =>
      categories.map((cat) => {
        const real = expensePerCategory[cat.id] ?? 0;
        const diff = cat.allocated - real;
        const pct = cat.allocated > 0 ? Math.round((real / cat.allocated) * 100) : 0;
        return { ...cat, real, diff, pct };
      }),
    [categories, expensePerCategory],
  );

  const chartData = rows.map((r) => ({
    name: r.name,
    Alocat: r.allocated,
    Real: r.real,
  }));

  // CRUD
  const openNew = () => {
    setEditId(null);
    setFormName("");
    setFormAllocated("");
    setDialogOpen(true);
  };

  const openEdit = (cat: BudgetCategory) => {
    setEditId(cat.id);
    setFormName(cat.name);
    setFormAllocated(String(cat.allocated));
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formName.trim()) {
      toast.error("Numele categoriei este obligatoriu");
      return;
    }
    const allocated = Number(formAllocated);
    if (isNaN(allocated) || allocated < 0) {
      toast.error("Bugetul alocat trebuie sa fie un numar pozitiv");
      return;
    }

    let updated: BudgetCategory[];
    if (editId) {
      updated = categories.map((c) => (c.id === editId ? { ...c, name: formName.trim(), allocated } : c));
      toast.success("Categorie actualizata");
    } else {
      const newCat: BudgetCategory = {
        id: crypto.randomUUID(),
        name: formName.trim(),
        allocated,
      };
      updated = [...categories, newCat];
      toast.success("Categorie adaugata");
    }

    setCategories(updated);
    setCollection(STORAGE_KEYS.budgets, updated);
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    const updated = categories.filter((c) => c.id !== id);
    setCategories(updated);
    setCollection(STORAGE_KEYS.budgets, updated);
    setDeleteId(null);
    toast.success("Categorie stearsa");
  };

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Buget & Planificare</h1>
      </Header>

      <Main className="space-y-6">
        {/* BarChart buget vs real */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Buget Alocat vs Cheltuieli Reale</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nu exista categorii definite.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(val) => [formatCurrency(Number(val))]} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Alocat" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Real" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Tabel categorii */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Categorii Buget</CardTitle>
            <Button size="sm" onClick={openNew}>
              <Plus className="w-4 h-4 mr-1" /> Adauga
            </Button>
          </CardHeader>
          <CardContent>
            {/* Desktop */}
            <div className="hidden md:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categorie</TableHead>
                    <TableHead className="text-right">Buget Alocat</TableHead>
                    <TableHead className="text-right">Cheltuieli Reale</TableHead>
                    <TableHead className="text-right">Diferenta</TableHead>
                    <TableHead>Utilizare</TableHead>
                    <TableHead className="text-right">Actiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nu exista categorii definite.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {row.name}
                            {row.pct > 90 && (
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 border text-xs">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                &gt;90%
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(row.allocated)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.real)}</TableCell>
                        <TableCell className={`text-right font-medium ${row.diff >= 0 ? "text-green-500" : "text-red-500"}`}>{formatCurrency(row.diff)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={Math.min(row.pct, 100)} className="h-2 w-24" />
                            <span className={`text-xs font-medium ${row.pct > 90 ? "text-red-400" : "text-muted-foreground"}`}>{row.pct}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(row)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => setDeleteId(row.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile */}
            <div className="flex flex-col gap-3 md:hidden">
              {rows.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nu exista categorii definite.</p>
              ) : (
                rows.map((row) => (
                  <div key={row.id} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{row.name}</p>
                        {row.pct > 90 && (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 border text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            &gt;90%
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(row)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => setDeleteId(row.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm border-t pt-2">
                      <span className="text-muted-foreground">Buget Alocat</span>
                      <span className="text-right font-medium">{formatCurrency(row.allocated)}</span>
                      <span className="text-muted-foreground">Cheltuieli Reale</span>
                      <span className="text-right font-medium">{formatCurrency(row.real)}</span>
                      <span className="text-muted-foreground">Diferenta</span>
                      <span className={`text-right font-medium ${row.diff >= 0 ? "text-green-500" : "text-red-500"}`}>{formatCurrency(row.diff)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(row.pct, 100)} className="h-2 flex-1" />
                      <span className={`text-xs font-medium ${row.pct > 90 ? "text-red-400" : "text-muted-foreground"}`}>{row.pct}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </Main>

      {/* Dialog CRUD */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Editeaza Categorie" : "Adauga Categorie"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Nume categorie</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="ex: Combustibil" />
            </div>
            <div className="space-y-1">
              <Label>Buget alocat (RON)</Label>
              <Input type="number" min={0} value={formAllocated} onChange={(e) => setFormAllocated(e.target.value)} placeholder="ex: 10000" />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setDialogOpen(false)}>
              Anuleaza
            </Button>
            <Button className="w-full sm:w-auto" onClick={handleSave}>
              {editId ? "Salveaza" : "Adauga"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog stergere */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sterge categorie</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">Esti sigur ca vrei sa stergi aceasta categorie?</p>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setDeleteId(null)}>
              Anuleaza
            </Button>
            <Button className="w-full sm:w-auto bg-red-600 hover:bg-red-700" onClick={() => deleteId && handleDelete(deleteId)}>
              Sterge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
