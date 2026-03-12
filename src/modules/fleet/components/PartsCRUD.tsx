import { useEffect, useMemo, useState } from "react";
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

import { STORAGE_KEYS } from "@/data/mock-data";
import { getCollection } from "@/utils/local-storage";

import type { Part } from "@/modules/fleet/types";
import { AllocatePart } from "@/modules/fleet/components/AllocatePart";
<<<<<<< HEAD
import {
  savePart,
  deletePart,
  isLowStock, // Presupunem că funcția isLowStock este definită corect aici
} from "@/modules/fleet/utils/partsUtils";
=======
import { savePart, deletePart, isLowStock } from "@/modules/fleet/utils/partsUtils";
import { exportPartsToExcel } from "@/modules/fleet/utils/exportExcel";
>>>>>>> e3bd55aec69a5de90eda6c0ffa83b9e6d2a74ef7

const emptyForm: Omit<Part, "id"> = {
  name: "",
  code: "",
  category: "",
  quantity: 0,
  unitPrice: 0,
  supplier: "",
  minStock: 0,
};

export function PartsCRUD() {
  const [parts, setParts] = useState<Part[]>([]);
  const [open, setOpen] = useState(false); // Stare pentru deschiderea/închiderea modalului
  const [editingPart, setEditingPart] = useState<Part | null>(null); // Piesa curentă editată
  const [form, setForm] = useState<Omit<Part, "id">>(emptyForm); // Starea formularului

  // State-uri pentru filtrare - vor fi null pentru "Toate" (adică nicio selecție)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState<
    "in_stock" | "low_stock" | "out_of_stock" | null
  >(null);
  const [searchText, setSearchText] = useState("");

  // Starea pentru paginare
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  useEffect(() => {
    setParts(getCollection<Part>(STORAGE_KEYS.parts));
  }, []);

  const save = (updated: Part[]) => {
    setParts(updated);
    localStorage.setItem(STORAGE_KEYS.parts, JSON.stringify(updated));
  };

  const handleOpen = (part?: Part) => {
    if (part) {
      setEditingPart(part);
      const { id, ...rest } = part; // Excludem ID-ul din formă
      setForm(rest);
    } else {
      setEditingPart(null);
      setForm(emptyForm);
    }
    setOpen(true);
  };

  const handleSubmit = () => {
    save(savePart(parts, form, editingPart));
    setOpen(false);
  };

<<<<<<< HEAD
  const handleDelete = (id: string) => {
    save(deletePart(parts, id));
  };
=======
    return (
        <div>
            <div className="flex justify-start gap-2 mb-4 px-6">
                <Button onClick={() => handleOpen()}>+ Adaugă piesă</Button>
                <Button variant="outline" onClick={() => exportPartsToExcel(parts)}>
                    ⬇ Export Excel
                </Button>
            </div>
>>>>>>> e3bd55aec69a5de90eda6c0ffa83b9e6d2a74ef7

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: ["quantity", "unitPrice", "minStock"].includes(name) // Convertește la număr pentru câmpurile numerice
        ? Number(value)
        : value,
    }));
  };

  const filteredParts = useMemo(() => {
    return parts.filter((part) => {
      const search = searchText.toLowerCase();
      if (search) {
        if (
          !part.name.toLowerCase().includes(search) &&
          !part.code.toLowerCase().includes(search) &&
          !part.supplier.toLowerCase().includes(search)
        )
          return false;
      }
      if (categoryFilter && part.category !== categoryFilter) return false;
      if (stockFilter) {
        const low = isLowStock(part);
        if (stockFilter === "in_stock" && part.quantity > 0 && !low)
          return true;
        if (stockFilter === "low_stock" && low) return true;
        if (stockFilter === "out_of_stock" && part.quantity === 0) return true;
        return false;
      }
      return true;
    });
  }, [parts, searchText, categoryFilter, stockFilter]); // Dependențe pentru useMemo

  const columns: ColumnDef<Part>[] = [
    {
      accessorKey: "name",
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
    },
    {
      accessorKey: "quantity",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Cantitate" />
      ),
      cell: ({ row }) => (
        <Badge variant={isLowStock(row.original) ? "destructive" : "secondary"}>
          {row.original.quantity} buc.
        </Badge>
      ),
    },
    {
      accessorKey: "minStock",
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
    },
    {
      id: "actions",
      header: "Acțiuni",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2 justify-center">
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

  const categories = useMemo(
    () => [...new Set(parts.map((p) => p.category))],
    [parts],
  );

  return (
    <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Butonul de adăugare piesă */}
      <div className="flex justify-start mb-4">
        <Button onClick={() => handleOpen()}>+ Adaugă piesă</Button>
      </div>

      {/* Filtre */}
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
            // Valoarea "all_categories" va fi mapată la null în onValueChange
            value={categoryFilter ?? "__ALL_CATEGORIES__"} // Folosim o valoare sentinelă non-vidă
            onValueChange={(v: string) =>
              setCategoryFilter(v === "__ALL_CATEGORIES__" ? null : v)
            }
          >
            <SelectTrigger id="category-filter" className="w-[180px]">
              <SelectValue placeholder="Toate categoriile" />
            </SelectTrigger>
            <SelectContent>
              {/* SelectItem pentru "Toate" cu valoare non-vidă */}
              <SelectItem value="__ALL_CATEGORIES__">Toate</SelectItem>{" "}
              {/* <-- Valoare non-vidă */}
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="stock-filter">Stoc</Label>
          <Select
            value={stockFilter ?? "__ALL_STOCK_STATUSES__"} // Folosim o valoare sentinelă non-vidă
            onValueChange={(
              v:
                | "in_stock"
                | "low_stock"
                | "out_of_stock"
                | "__ALL_STOCK_STATUSES__", // Tipul parametrului include sentinela
            ) => setStockFilter(v === "__ALL_STOCK_STATUSES__" ? null : v)}
          >
            <SelectTrigger id="stock-filter" className="w-[180px]">
              <SelectValue placeholder="Toate statusurile" />
            </SelectTrigger>
            <SelectContent>
              {/* SelectItem pentru "Toate" cu valoare non-vidă */}
              <SelectItem value="__ALL_STOCK_STATUSES__">Toate</SelectItem>{" "}
              {/* <-- Valoare non-vidă */}
              <SelectItem value="in_stock">În stoc</SelectItem>
              <SelectItem value="low_stock">Stoc scăzut</SelectItem>
              <SelectItem value="out_of_stock">Stoc epuizat</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabel */}
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

      {/* Paginare și selectare număr de rânduri pe pagină */}
      <div className="flex items-center justify-between py-2">
        <DataTablePagination table={table} />
        <div className="flex items-center space-x-2">
          <Label htmlFor="page-size-select">Rânduri / pagină</Label>
          <Select
            value={pagination.pageSize.toString()}
            onValueChange={(v: string) => table.setPageSize(Number(v))}
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

      {/* Modal pentru adăugare/editare piesă */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPart ? "Editează piesă" : "Adaugă piesă"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              name="name"
              placeholder="Nume"
              value={form.name}
              onChange={handleChange}
            />
            <Input
              name="code"
              placeholder="Cod"
              value={form.code}
              onChange={handleChange}
            />
            <Input
              name="category"
              placeholder="Categorie"
              value={form.category}
              onChange={handleChange}
            />
            <Input
              name="supplier"
              placeholder="Furnizor"
              value={form.supplier}
              onChange={handleChange}
            />
            <Input
              name="quantity"
              type="number"
              placeholder="Cantitate"
              value={form.quantity}
              onChange={handleChange}
            />
            <Input
              name="minStock"
              type="number"
              placeholder="Stoc minim"
              value={form.minStock}
              onChange={handleChange}
            />
            <Input
              name="unitPrice"
              type="number"
              placeholder="Preț unitar"
              value={form.unitPrice}
              onChange={handleChange}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Anulează
            </Button>
            <Button onClick={handleSubmit}>
              {editingPart ? "Salvează" : "Adaugă"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
