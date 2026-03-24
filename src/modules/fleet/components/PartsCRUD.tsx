import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { STORAGE_KEYS } from "@/data/mock-data";
import { getCollection } from "@/utils/local-storage";
import type { Part } from "@/modules/fleet/types";
import { AllocatePart } from "@/modules/fleet/components/AllocatePart";
import {
  savePart,
  deletePart,
  isLowStock,
} from "@/modules/fleet/utils/partsUtils";
import { exportPartsToExcel } from "@/modules/fleet/utils/exportExcel";
import { partSchema } from "@/modules/fleet/validation/fleetSchemas";

type PartFormValues = z.infer<typeof partSchema>;

const CATEGORY_LABELS: Record<string, string> = {
  engine: "Motor",
  body: "Caroserie",
  electrical: "Electric",
  other: "Altele",
};

const defaultValues: PartFormValues = {
  name: "",
  code: "",
  category: "other",
  quantity: 0,
  minStock: 0,
  unitPrice: 0,
  supplier: "",
};

export function PartsCRUD() {
  const [parts, setParts] = useState<Part[]>([]);
  const [open, setOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);

  const form = useForm<PartFormValues>({
    resolver: zodResolver(partSchema),
    defaultValues,
  });

  useEffect(() => {
    setParts(getCollection<Part>(STORAGE_KEYS.parts));
  }, []);

  const persist = (updated: Part[]) => {
    setParts(updated);
    localStorage.setItem(STORAGE_KEYS.parts, JSON.stringify(updated));
  };

  const handleOpen = (part?: Part) => {
    if (part) {
      setEditingPart(part);
      form.reset({
        name: part.name,
        code: (part as any).code ?? "",
        category: part.category as PartFormValues["category"],
        quantity: part.quantity,
        minStock: part.minStock,
        unitPrice: part.unitPrice,
        supplier: part.supplier ?? "",
      });
    } else {
      setEditingPart(null);
      form.reset(defaultValues);
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    form.reset(defaultValues);
    setEditingPart(null);
  };

  const onSubmit = (values: PartFormValues) => {
    persist(savePart(parts, values as Omit<Part, "id">, editingPart));
    handleClose();
  };

  const handleDelete = (id: string) => {
    persist(deletePart(parts, id));
  };

  return (
    <div>
      <div className="flex justify-start gap-2 mb-4 px-6">
        <Button onClick={() => handleOpen()}>+ Adaugă piesă</Button>
        <Button variant="outline" onClick={() => exportPartsToExcel(parts)}>
          ⬇ Export Excel
        </Button>
      </div>

      {parts.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">
          Nu există piese înregistrate.
        </p>
      ) : (
        <div className="overflow-x-auto w-full px-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-left">
                <th className="pb-3 pr-4 font-medium">Nume</th>
                <th className="pb-3 pr-4 font-medium">Categorie</th>
                <th className="pb-3 pr-4 font-medium">Furnizor</th>
                <th className="pb-3 pr-4 font-medium">Preț unitar</th>
                <th className="pb-3 pr-4 font-medium">Cantitate</th>
                <th className="pb-3 pr-4 font-medium">Stoc</th>
                <th className="pb-3 text-center font-medium">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {parts.map((part) => {
                const isLow = isLowStock(part);
                return (
                  <tr
                    key={part.id}
                    className="border-b last:border-0 hover:bg-muted/40 transition-colors"
                  >
                    <td className="py-3 pr-4 font-semibold">{part.name}</td>
                    <td className="py-3 pr-4">
                      {CATEGORY_LABELS[part.category] ?? part.category}
                    </td>
                    <td className="py-3 pr-4">{part.supplier}</td>
                    <td className="py-3 pr-4">
                      {part.unitPrice.toLocaleString("ro-RO")} RON
                    </td>
                    <td
                      className={`py-3 pr-4 font-semibold ${isLow ? "text-red-500" : ""}`}
                    >
                      {part.quantity} buc.
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={isLow ? "destructive" : "default"}>
                        {isLow ? "Stoc scăzut" : "OK"}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2 items-center justify-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpen(part)}
                        >
                          Editează
                        </Button>
                        <AllocatePart part={part} />
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(part.id)}
                        >
                          Șterge
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) handleClose();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPart ? "Editează piesă" : "Adaugă piesă"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="grid gap-4 py-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nume *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cod (opțional)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categorie *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selectează categorie..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                          <SelectItem key={val} value={val}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Furnizor (opțional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cantitate *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unitPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preț unitar *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="minStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stoc minim *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Anulează
                </Button>
                <Button type="submit">
                  {editingPart ? "Salvează" : "Adaugă"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
