import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type PaginationState,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DataTableColumnHeader,
  DataTablePagination,
} from "@/components/data-table";
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
import { useAuditLog } from "@/hooks/use-audit-log";
import type { Part } from "@/modules/fleet/types";
import { AllocatePart } from "@/modules/fleet/components/AllocatePart";
import { savePart, deletePart, isLowStock } from "@/modules/fleet/utils/partsUtils";
import { exportPartsToExcel } from "@/modules/fleet/utils/exportExcel";
import { makePartSchema } from "@/modules/fleet/validation/fleetSchemas";

function getCategoryLabels(t: (k: string) => string): Record<string, string> {
  return {
    engine: t("fleet.parts.categoryEngine"),
    body: t("fleet.parts.categoryBody"),
    electrical: t("fleet.parts.categoryElectrical"),
    other: t("fleet.parts.categoryOther"),
  };
}

export function PartsCRUD() {
  const { t } = useTranslation();
  const { log } = useAuditLog();

  const partSchema = useMemo(() => makePartSchema(t), [t]);
  type PartFormValues = z.infer<typeof partSchema>;

  const categoryLabels = getCategoryLabels(t);

  const defaultValues: PartFormValues = {
    name: "",
    code: "",
    category: "other",
    quantity: 0,
    minStock: 0,
    unitPrice: 0,
    supplier: "",
  };

  const [parts, setParts] = useState<Part[]>([]);
  const [open, setOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState<"in_stock" | "low_stock" | "out_of_stock" | null>(null);
  const [searchText, setSearchText] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

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
        code: part.code ?? "",
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
    const updated = savePart(parts, values as Omit<Part, "id">, editingPart);
    persist(updated);
    if (editingPart) {
      log({ action: "update", entity: "part", entityId: editingPart.id, entityLabel: values.name, detailKey: "activityLog.details.partUpdated", oldValue: { name: editingPart.name, quantity: editingPart.quantity }, newValue: { name: values.name, quantity: values.quantity } });
    } else {
      const newPart = updated.find((p) => p.name === values.name && !parts.some((ep) => ep.id === p.id));
      log({ action: "create", entity: "part", entityId: newPart?.id ?? "new", entityLabel: values.name, detailKey: "activityLog.details.partCreated", detailParams: { name: values.name } });
    }
    handleClose();
  };

  const handleDelete = (id: string) => {
    const part = parts.find((p) => p.id === id);
    log({ action: "delete", entity: "part", entityId: id, entityLabel: part?.name ?? id, detailKey: "activityLog.details.partDeleted" });
    persist(deletePart(parts, id));
  };

  const filteredParts = useMemo(() => {
    return parts.filter((part) => {
      const search = searchText.toLowerCase();
      if (search) {
        if (
          !part.name.toLowerCase().includes(search) &&
          !part.code.toLowerCase().includes(search) &&
          !part.supplier.toLowerCase().includes(search)
        ) return false;
      }
      if (categoryFilter && part.category !== categoryFilter) return false;
      if (stockFilter) {
        const low = isLowStock(part);
        if (stockFilter === "in_stock" && part.quantity > 0 && !low) return true;
        if (stockFilter === "low_stock" && low) return true;
        if (stockFilter === "out_of_stock" && part.quantity === 0) return true;
        return false;
      }
      return true;
    });
  }, [parts, searchText, categoryFilter, stockFilter]);

  const columns: ColumnDef<Part>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("fleet.parts.columnName")} />,
    },
    {
      accessorKey: "code",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("fleet.parts.columnCode")} />,
    },
    {
      accessorKey: "category",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("fleet.parts.columnCategory")} />,
      cell: ({ row }) => categoryLabels[row.original.category] ?? row.original.category,
    },
    {
      accessorKey: "quantity",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("fleet.parts.columnQuantity")} />,
      cell: ({ row }) => (
        <Badge variant={isLowStock(row.original) ? "destructive" : "secondary"}>
          {row.original.quantity} {t("fleet.parts.unit")}
        </Badge>
      ),
    },
    {
      accessorKey: "minStock",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("fleet.parts.columnMinStock")} />,
    },
    {
      accessorKey: "unitPrice",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("fleet.parts.columnUnitPrice")} />,
      cell: ({ row }) => <span>{row.original.unitPrice.toLocaleString("ro-RO")} RON</span>,
    },
    {
      accessorKey: "supplier",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("fleet.parts.columnSupplier")} />,
    },
    {
      id: "actions",
      header: t("fleet.parts.columnActions"),
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2 justify-center">
          <Button size="sm" variant="outline" onClick={() => handleOpen(row.original)}>{t("fleet.parts.edit")}</Button>
          <AllocatePart part={row.original} />
          <Button size="sm" variant="destructive" onClick={() => handleDelete(row.original.id)}>{t("fleet.parts.delete")}</Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: filteredParts,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const categories = useMemo(() => [...new Set(parts.map((p) => p.category))], [parts]);

  return (
    <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-start gap-2 mb-4">
        <Button onClick={() => handleOpen()}>{t("fleet.parts.addPart")}</Button>
        <Button variant="outline" onClick={() => exportPartsToExcel(parts, t)}>{t("fleet.parts.exportExcel")}</Button>
      </div>

      <div className="flex flex-wrap gap-4 items-end mb-4">
        <div>
          <Label htmlFor="search-input">{t("fleet.parts.searchLabel")}</Label>
          <Input
            id="search-input"
            placeholder={t("fleet.parts.searchPlaceholder")}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="category-filter">{t("fleet.parts.categoryLabel")}</Label>
          <Select
            value={categoryFilter ?? "_ALL_"}
            onValueChange={(v) => setCategoryFilter(v === "_ALL_" ? null : v)}
          >
            <SelectTrigger id="category-filter" className="w-[180px]">
              <SelectValue placeholder={t("fleet.parts.allCategories")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_ALL_">{t("fleet.parts.allCategories")}</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{categoryLabels[c] ?? c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="stock-filter">{t("fleet.parts.stockLabel")}</Label>
          <Select
            value={stockFilter ?? "_ALL_"}
            onValueChange={(v: string) => setStockFilter(v === "_ALL_" ? null : v as "in_stock" | "low_stock" | "out_of_stock")}
          >
            <SelectTrigger id="stock-filter" className="w-[180px]">
              <SelectValue placeholder={t("fleet.parts.allStatuses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_ALL_">{t("fleet.parts.allStatuses")}</SelectItem>
              <SelectItem value="in_stock">{t("fleet.parts.inStock")}</SelectItem>
              <SelectItem value="low_stock">{t("fleet.parts.lowStockFilter")}</SelectItem>
              <SelectItem value="out_of_stock">{t("fleet.parts.outOfStock")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between py-2">
        <DataTablePagination table={table} />
        <div className="flex items-center space-x-2">
          <Label htmlFor="page-size-select">{t("fleet.parts.rowsPerPage")}</Label>
          <Select
            value={pagination.pageSize.toString()}
            onValueChange={(v) => table.setPageSize(Number(v))}
          >
            <SelectTrigger id="page-size-select" className="w-[76px]">
              <SelectValue placeholder={pagination.pageSize.toString()} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPart ? t("fleet.parts.dialogTitleEdit") : t("fleet.parts.dialogTitleAdd")}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fleet.parts.labelName")}</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="code" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fleet.parts.labelCode")}</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fleet.parts.labelCategory")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder={t("fleet.parts.selectCategory")} /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="supplier" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fleet.parts.labelSupplier")}</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField control={form.control} name="quantity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fleet.parts.labelQuantity")}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="unitPrice" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fleet.parts.labelUnitPrice")}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="minStock" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fleet.parts.labelMinStock")}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>{t("fleet.parts.cancel")}</Button>
                <Button type="submit">{editingPart ? t("fleet.parts.save") : t("fleet.parts.add")}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
