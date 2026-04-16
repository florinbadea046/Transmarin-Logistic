import * as React from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Search, Users } from "lucide-react";
import { toast } from "sonner";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { Client } from "@/modules/accounting/types";
import {
  getCollection,
  addItem,
  updateItem,
  removeItem,
  generateId,
} from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import { ensureClientsSeeded } from "../utils/clients";

type FormState = Omit<Client, "id" | "createdAt">;

const emptyForm: FormState = {
  name: "",
  cui: "",
  address: "",
  phone: "",
  email: "",
  bankAccount: "",
  contactPerson: "",
  notes: "",
};

export default function ClientsPage() {
  const { t } = useTranslation();
  const [clients, setClients] = React.useState<Client[]>([]);
  const [search, setSearch] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FormState>(emptyForm);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setClients(ensureClientsSeeded());
  }, []);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.cui ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q),
    );
  }, [clients, search]);

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: Client) => {
    setEditId(c.id);
    setForm({
      name: c.name,
      cui: c.cui ?? "",
      address: c.address ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      bankAccount: c.bankAccount ?? "",
      contactPerson: c.contactPerson ?? "",
      notes: c.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error(t("clients.validation.nameRequired"));
      return;
    }

    if (editId) {
      updateItem<Client>(
        STORAGE_KEYS.clients,
        (c) => c.id === editId,
        (c) => ({ ...c, ...form, name: form.name.trim() }),
      );
      toast.success(t("clients.toast.updated"));
    } else {
      const newClient: Client = {
        id: generateId(),
        ...form,
        name: form.name.trim(),
        createdAt: new Date().toISOString(),
      };
      addItem<Client>(STORAGE_KEYS.clients, newClient);
      toast.success(t("clients.toast.created"));
    }

    setClients(getCollection<Client>(STORAGE_KEYS.clients));
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    removeItem<Client>(STORAGE_KEYS.clients, (c) => c.id === deleteId);
    setClients(getCollection<Client>(STORAGE_KEYS.clients));
    setDeleteId(null);
    toast.success(t("clients.toast.deleted"));
  };

  return (
    <>
      <Header>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h1 className="text-lg font-semibold">{t("clients.title")}</h1>
        </div>
      </Header>
      <Main>
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">
                {t("clients.subtitle", { count: filtered.length })}
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-8 h-8 w-48 sm:w-64"
                    placeholder={t("clients.searchPlaceholder")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button size="sm" onClick={openNew}>
                  <Plus className="h-4 w-4 mr-1" />
                  {t("clients.actions.new")}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("clients.fields.name")}</TableHead>
                    <TableHead>{t("clients.fields.cui")}</TableHead>
                    <TableHead>{t("clients.fields.phone")}</TableHead>
                    <TableHead>{t("clients.fields.email")}</TableHead>
                    <TableHead>{t("clients.fields.contactPerson")}</TableHead>
                    <TableHead className="w-[100px] text-right">{t("clients.fields.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        {t("clients.empty")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>{c.cui ?? "—"}</TableCell>
                        <TableCell>{c.phone ?? "—"}</TableCell>
                        <TableCell>{c.email ?? "—"}</TableCell>
                        <TableCell>{c.contactPerson ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(c.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </Main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editId ? t("clients.dialog.editTitle") : t("clients.dialog.newTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="col-span-1 sm:col-span-2 space-y-1">
              <Label htmlFor="client-name">{t("clients.fields.name")} *</Label>
              <Input
                id="client-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="client-cui">{t("clients.fields.cui")}</Label>
              <Input
                id="client-cui"
                value={form.cui ?? ""}
                onChange={(e) => setForm({ ...form, cui: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="client-phone">{t("clients.fields.phone")}</Label>
              <Input
                id="client-phone"
                value={form.phone ?? ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="col-span-1 sm:col-span-2 space-y-1">
              <Label htmlFor="client-email">{t("clients.fields.email")}</Label>
              <Input
                id="client-email"
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="col-span-1 sm:col-span-2 space-y-1">
              <Label htmlFor="client-address">{t("clients.fields.address")}</Label>
              <Input
                id="client-address"
                value={form.address ?? ""}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="client-contact">{t("clients.fields.contactPerson")}</Label>
              <Input
                id="client-contact"
                value={form.contactPerson ?? ""}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="client-bank">{t("clients.fields.bankAccount")}</Label>
              <Input
                id="client-bank"
                value={form.bankAccount ?? ""}
                onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
              />
            </div>
            <div className="col-span-1 sm:col-span-2 space-y-1">
              <Label htmlFor="client-notes">{t("clients.fields.notes")}</Label>
              <Textarea
                id="client-notes"
                rows={2}
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("clients.actions.cancel")}
            </Button>
            <Button onClick={handleSave}>{t("clients.actions.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("clients.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("clients.delete.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("clients.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t("clients.actions.confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
