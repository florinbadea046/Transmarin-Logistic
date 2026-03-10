import { useEffect, useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Supplier } from "@/modules/accounting/types";
import { STORAGE_KEYS } from "@/data/mock-data";
import { SupplierModal } from "../components/SupplierModal";
import { getCollection, setCollection } from "@/utils/local-storage";

const columnHelper = createColumnHelper<Supplier>();

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    setSuppliers(getCollection<Supplier>(STORAGE_KEYS.suppliers));
  }, []);

  const filteredSuppliers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s) =>
      [s.name, s.cui, s.address, s.phone, s.email, s.bankAccount]
        .some((val) => val?.toLowerCase().includes(q))
    );
  }, [suppliers, search]);

  const handleSave = (supplier: Supplier) => {
    let updated: Supplier[];
    if (selectedSupplier) {
      updated = suppliers.map((s) => (s.id === supplier.id ? supplier : s));
    } else {
      updated = [...suppliers, { ...supplier, id: crypto.randomUUID() }];
    }
    setSuppliers(updated);
    setCollection(STORAGE_KEYS.suppliers, updated);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Sigur vrei să ștergi acest furnizor?")) return;
    const updated = suppliers.filter((s) => s.id !== id);
    setSuppliers(updated);
    setCollection(STORAGE_KEYS.suppliers, updated);
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", { header: "Nume" }),
      columnHelper.accessor("cui", { header: "CUI" }),
      columnHelper.accessor("address", { header: "Adresă" }),
      columnHelper.accessor("phone", { header: "Telefon" }),
      columnHelper.accessor("email", { header: "Email" }),
      columnHelper.accessor("bankAccount", { header: "Cont bancar" }),
      columnHelper.display({
        id: "actions",
        header: "Acțiuni",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSelectedSupplier(row.original);
                setIsModalOpen(true);
              }}
              className="bg-yellow-500 px-3 py-1 rounded text-black text-sm"
            >
              Edit
            </button>
            <button
              onClick={() => handleDelete(row.original.id)}
              className="bg-red-600 px-3 py-1 rounded text-white text-sm"
            >
              Delete
            </button>
          </div>
        ),
      }),
    ],
    [suppliers]
  );

  const table = useReactTable({
    data: filteredSuppliers, 
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 5 } },
  });

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold text-white">Furnizori</h1>
      </Header>

      <Main>
        <div className="mb-4">
          <input
            type="text"
            placeholder="Caută după orice câmp..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              table.setPageIndex(0);
            }}
            className="w-full rounded-md border border-gray-600 bg-slate-800 text-white p-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <Card className="bg-slate-900 border border-slate-700">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
            <CardTitle className="text-white">Gestiune Furnizori</CardTitle>
            <button
              onClick={() => {
                setSelectedSupplier(null);
                setIsModalOpen(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full md:w-auto"
            >
              + Adaugă Furnizor
            </button>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-white text-sm">
                <thead className="bg-slate-700">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="p-3 text-left cursor-pointer select-none hover:bg-slate-600"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getIsSorted() === "asc" && " ↑"}
                          {header.column.getIsSorted() === "desc" && " ↓"}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} className="p-4 text-center text-slate-400">
                        Niciun furnizor găsit
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <tr key={row.id} className="border-b border-slate-700 hover:bg-slate-800">
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="p-3">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap justify-between items-center mt-4 text-white gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">Rânduri pe pagină:</span>
                <select
                  value={table.getState().pagination.pageSize}
                  onChange={(e) => table.setPageSize(Number(e.target.value))}
                  className="bg-slate-700 text-white rounded px-2 py-1 text-sm"
                >
                  {[5, 10, 20].map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="text-sm">
                  Pagina {table.getState().pagination.pageIndex + 1} din {table.getPageCount()}
                </span>
                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-40"
                >
                  Următor
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </Main>

      {isModalOpen && (
        <SupplierModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          initialData={selectedSupplier}
          onSave={handleSave}
        />
      )}
    </>
  );
}