import { useEffect, useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { Supplier } from "@/modules/accounting/types";
import { STORAGE_KEYS } from "@/data/mock-data";
import { useAuditLog } from "@/hooks/use-audit-log";
import { useAccountingAuditLog } from "@/hooks/use-accounting-audit-log";
import { SupplierModal } from "../components/SupplierModal";
import { getCollection, setCollection } from "@/utils/local-storage";

const columnHelper = createColumnHelper<Supplier>();

export default function SuppliersPage() {
  const { t } = useTranslation();
  const { log } = useAuditLog();
  const { log: logAccounting } = useAccountingAuditLog();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setSuppliers(getCollection<Supplier>(STORAGE_KEYS.suppliers));
  }, []);

  const filteredSuppliers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;

    return suppliers.filter((s) =>
      [s.name, s.cui, s.address, s.phone, s.email, s.bankAccount].some((val) =>
        val?.toLowerCase().includes(q),
      ),
    );
  }, [suppliers, search]);

const handleSave = (supplier: Supplier) => {
  let updated: Supplier[];

  if (selectedSupplier) {
    updated = suppliers.map((s) => (s.id === supplier.id ? supplier : s));
    log({ action: "update", entity: "supplier", entityId: supplier.id, entityLabel: supplier.name, detailKey: "activityLog.details.supplierUpdated", oldValue: { name: selectedSupplier.name, cui: selectedSupplier.cui }, newValue: { name: supplier.name, cui: supplier.cui } });
    logAccounting({ action: "update", entity: "supplier", entityId: supplier.id, entityLabel: supplier.name, details: t("suppliers.audit.updated"), oldValue: { name: selectedSupplier.name, cui: selectedSupplier.cui }, newValue: { name: supplier.name, cui: supplier.cui } });
  } else {
    const newId = crypto.randomUUID();
    updated = [...suppliers, { ...supplier, id: newId }];
    log({ action: "create", entity: "supplier", entityId: newId, entityLabel: supplier.name, detailKey: "activityLog.details.supplierCreated", detailParams: { name: supplier.name } });
    logAccounting({ action: "create", entity: "supplier", entityId: newId, entityLabel: supplier.name, details: `Furnizor creat: ${supplier.name}` });
  }

  setSuppliers(updated);
  setCollection(STORAGE_KEYS.suppliers, updated);
  setIsModalOpen(false);
};

  const confirmDelete = useCallback(() => {
    if (!deleteId) return;

    const supplier = suppliers.find((s) => s.id === deleteId);
    log({ action: "delete", entity: "supplier", entityId: deleteId, entityLabel: supplier?.name ?? deleteId, detailKey: "activityLog.details.supplierDeleted" });
    logAccounting({ action: "delete", entity: "supplier", entityId: deleteId, entityLabel: supplier?.name ?? deleteId, details: t("suppliers.audit.deleted") });
    const updated = suppliers.filter((s) => s.id !== deleteId);
    setSuppliers(updated);
    setCollection(STORAGE_KEYS.suppliers, updated);
    setDeleteId(null);
  }, [deleteId, log, logAccounting, suppliers, t]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", { header: t("suppliers.fields.name") }),
      columnHelper.accessor("cui", { header: t("suppliers.fields.cui") }),
      columnHelper.accessor("address", {
        header: t("suppliers.fields.address"),
      }),
      columnHelper.accessor("phone", { header: t("suppliers.fields.phone") }),
      columnHelper.accessor("email", { header: t("suppliers.fields.email") }),
      columnHelper.accessor("bankAccount", {
        header: t("suppliers.fields.bankAccount"),
      }),
      columnHelper.display({
        id: "actions",
        header: t("suppliers.fields.actions"),
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSelectedSupplier(row.original);
                setIsModalOpen(true);
              }}
            >
              {t("suppliers.actions.edit")}
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteId(row.original.id)}
            >
              {t("suppliers.actions.delete")}
            </Button>
          </div>
        ),
      }),
    ],
    [t],
  );

  const table = useReactTable({
    data: filteredSuppliers,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 5 },
    },
  });

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("suppliers.title")}</h1>
      </Header>

      <Main>
        <div className="mb-4">
          <Input
            placeholder={t("suppliers.search")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              table.setPageIndex(0);
            }}
          />
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
            <CardTitle>{t("suppliers.manage")}</CardTitle>

            <Button
              onClick={() => {
                setSelectedSupplier(null);
                setIsModalOpen(true);
              }}
            >
              + {t("suppliers.add")}
            </Button>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="p-3 text-left cursor-pointer select-none hover:bg-muted/70 font-medium text-muted-foreground"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
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
                      <td
                        colSpan={columns.length}
                        className="p-4 text-center text-muted-foreground"
                      >
                        {t("suppliers.noResults")}
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <tr key={row.id} className="border-b hover:bg-muted/30">
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="p-3">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap justify-between items-center mt-4 gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {t("suppliers.rowsPerPage")}:
                </span>

                <select
                  value={table.getState().pagination.pageSize}
                  onChange={(e) => table.setPageSize(Number(e.target.value))}
                  className="rounded border bg-background px-2 py-1 text-sm"
                >
                  {[5, 10, 20].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  {t("suppliers.prev")}
                </Button>

                <span className="text-sm text-muted-foreground">
                  {t("suppliers.page", {
                    current: table.getState().pagination.pageIndex + 1,
                    total: table.getPageCount(),
                  })}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  {t("suppliers.next")}
                </Button>
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

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("suppliers.actions.delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("suppliers.confirmDelete")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>{t("suppliers.modal.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              {t("suppliers.actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}