import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  PaginationState,
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
import type { Part } from "@/modules/fleet/types";
import { AllocatePart } from "@/modules/fleet/components/AllocatePart";
import { savePart, deletePart, isLowStock } from "@/modules/fleet/utils/partsUtils";
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
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
<<<<<<< HEAD
  const [stockFilter, setStockFilter] = useState<"in_stock" | "low_stock" | "out_of_stock" | null>(null);
  const [searchText, setSearchText] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
=======
  const [stockFilter, setStockFilter] = useState<
    "in_stock" | "low_stock" | "out_of_stock" | null
  >(null);
  const [searchText, setSearchText] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
>>>>>>> 97c816c (fix: properly resolved merge conflicts in PartsCRUD)

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

  const filteredParts = useMemo(() => {
    return parts.filter((part) => {
      const search = searchText.toLowerCase();
      if (search) {
        if (
          !part.name.toLowerCase().includes(search) &&
          !part.code.toLowerCase().includes(search) &&
          !part.supplier.toLowerCase().includes(search)
<<<<<<< HEAD
        ) return false;
=======
        )
          return false;
>>>>>>> 97c816c (fix: properly resolved merge conflicts in PartsCRUD)
      }
      if (categoryFilter && part.category !== categoryFilter) return false;
      if (stockFilter) {
        const low = isLowStock(part);
<<<<<<< HEAD
        if (stockFilter === "in_stock" && part.quantity > 0 && !low) return true;
=======
        if (stockFilter === "in_stock" && part.quantity > 0 && !low)
          return true;
>>>>>>> 97c816c (fix: properly resolved merge conflicts in PartsCRUD)
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
<<<<<<< HEAD
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nume" />,
    },
    {
      accessorKey: "code",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Cod" />,
    },
    {
      accessorKey: "category",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Categorie" />,
      cell: ({ row }) => CATEGORY_LABELS[row.original.category] ?? row.original.category,
    },
    {
      accessorKey: "quantity",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Cantitate" />,
=======
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nume" />
      ),
    },
    {
      accessorKey: "code",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Cod" />
      ),
    },
    {
      accessorKey: "category",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Categorie" />
      ),
      cell: ({ row }) =>
        CATEGORY_LABELS[row.original.category] ?? row.original.category,
    },
    {
      accessorKey: "quantity",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Cantitate" />
      ),
>>>>>>> 97c816c (fix: properly resolved merge conflicts in PartsCRUD)
      cell: ({ row }) => (
        <Badge variant={isLowStock(row.original) ? "destructive" : "secondary"}>
          {row.original.quantity} buc.
        </Badge>
      ),
    },
    {
      accessorKey: "minStock",
<<<<<<< HEAD
      header: ({ column }) => <DataTableColumnHeader column={column} title="Stoc minim" />,
    },
    {
      accessorKey: "unitPrice",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Preț unitar" />,
      cell: ({ row }) => <span>{row.original.unitPrice.toLocaleString("ro-RO")} RON</span>,
    },
    {
      accessorKey: "supplier",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Furnizor" />,
=======
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Stoc minim" />
      ),
    },
    {
      accessorKey: "unitPrice",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Preț unitar" />
      ),
      cell: ({ row }) => (
        <span>{row.original.unitPrice.toLocaleString("ro-RO")} RON</span>
      ),
    },
    {
      accessorKey: "supplier",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Furnizor" />
      ),
>>>>>>> 97c816c (fix: properly resolved merge conflicts in PartsCRUD)
    },
    {
      id: "actions",
      header: "Acțiuni",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2 justify-center">
<<<<<<< HEAD
          <Button size="sm" variant="outline" onClick={() => handleOpen(row.original)}>Editează</Button>
          <AllocatePart part={row.original} />
          <Button size="sm" variant="destructive" onClick={() => handleDelete(row.original.id)}>Șterge</Button>
=======
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOpen(row.original)}
          >
            Editează
          </Button>
          <AllocatePart part={row.original} />
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleDelete(row.original.id)}
          >
            Șterge
          </Button>
>>>>>>> 97c816c (fix: properly resolved merge conflicts in PartsCRUD)
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

<<<<<<< HEAD
  const categories = useMemo(() => [...new Set(parts.map((p) => p.category))], [parts]);
=======
  const categories = useMemo(
    () => [...new Set(parts.map((p) => p.category))],
    [parts],
  );
>>>>>>> 97c816c (fix: properly resolved merge conflicts in PartsCRUD)

  return (
    <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-start gap-2 mb-4">
        <Button onClick={() => handleOpen()}>+ Adaugă piesă</Button>
        <Button variant="outline" onClick={() => exportPartsToExcel(parts)}>⬇ Export Excel</Button>
      </div>

      <div className="flex flex-wrap gap-4 items-end mb-4">
        <div>
          <Label htmlFor="search-input">Caută</Label>
          <Input
            id="search-input"
            placeholder="Nume, cod sau furnizor..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="category-filter">Categorie</Label>
          <Select
            value={categoryFilter ?? "_ALL_"}
            onValueChange={(v) => setCategoryFilter(v === "_ALL_" ? null : v)}
          >
            <SelectTrigger id="category-filter" className="w-[180px]">
              <SelectValue placeholder="Toate categoriile" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_ALL_">Toate</SelectItem>
              {categories.map((c) => (
<<<<<<< HEAD
                <SelectItem key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</SelectItem>
=======
                <SelectItem key={c} value={c}>
                  {CATEGORY_LABELS[c] ?? c}
                </SelectItem>
>>>>>>> 97c816c (fix: properly resolved merge conflicts in PartsCRUD)
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="stock-filter">Stoc</Label>
          <Select
            value={stockFilter ?? "_ALL_"}
            onValueChange={(v: any) => setStockFilter(v === "_ALL_" ? null : v)}
          >
            <SelectTrigger id="stock-filter" className="w-[180px]">
              <SelectValue placeholder="Toate statusurile" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_ALL_">Toate</SelectItem>
              <SelectItem value="in_stock">În stoc</SelectItem>
              <SelectItem value="low_stock">Stoc scăzut</SelectItem>
              <SelectItem value="out_of_stock">Stoc epuizat</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
<<<<<<< HEAD

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
          <Label htmlFor="page-size-select">Rânduri / pagină</Label>
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
=======

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
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
          <Label htmlFor="page-size-select">Rânduri / pagină</Label>
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

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) handleClose();
        }}
      >
>>>>>>> 97c816c (fix: properly resolved merge conflicts in PartsCRUD)
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPart ? "Editează piesă" : "Adaugă piesă"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nume *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="code" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cod (opțional)</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Categorie *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Selectează categorie..." /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="supplier" render={({ field }) => (
                <FormItem>
                  <FormLabel>Furnizor (opțional)</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="quantity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantitate *</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="unitPrice" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preț unitar *</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="minStock" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stoc minim *</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>Anulează</Button>
                <Button type="submit">{editingPart ? "Salvează" : "Adaugă"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}