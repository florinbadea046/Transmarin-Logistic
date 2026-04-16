import * as React from "react";
import { useTranslation } from "react-i18next";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  useReactTable,
} from "@tanstack/react-table";
import { toast } from "sonner";
import { Upload } from "lucide-react";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/data-table/pagination";
import { DataTableToolbar } from "@/components/data-table/toolbar";

import type { Order } from "@/modules/transport/types";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import { useAuditLog } from "@/hooks/use-audit-log";

import {
  getStatusMeta,
  safeRandomId,
  setOrdersToStorage,
  isDuplicateOrder,
} from "./_components/order-utils";
import { getOrCreateClientId } from "@/modules/accounting/utils/clients";
import { OrderExportMenu } from "./_components/order-export-menu";
import { OrderImportDialog } from "./_components/order-import-dialog";
import { AdvancedFilters } from "./_components/order-advanced-filters";
import { OrderDetailDialog } from "./_components/order-detail-dialog";
import {
  OrderFormDialog,
  type OrderForm,
} from "./_components/order-form-dialog";
import { getOrderColumns } from "./_components/order-columns";

export default function OrdersPage() {
  const { t } = useTranslation();
  const { log } = useAuditLog();
  const statusMeta = React.useMemo(() => getStatusMeta(t), [t]);
  const statusFilterOptions = React.useMemo(
    () =>
      (Object.keys(statusMeta) as Order["status"][]).map((value) => ({
        value,
        label: statusMeta[value].label,
      })),
    [statusMeta],
  );
  const [data, setData] = React.useState<Order[]>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  const [addOpen, setAddOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editingOrder, setEditingOrder] = React.useState<Order | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletingOrder, setDeletingOrder] = React.useState<Order | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailOrder, setDetailOrder] = React.useState<Order | null>(null);
  const [importOpen, setImportOpen] = React.useState(false);

  const [dateFrom, setDateFrom] = React.useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = React.useState<Date | undefined>(undefined);
  const [filterOrigin, setFilterOrigin] = React.useState("");
  const [filterDestination, setFilterDestination] = React.useState("");

  React.useEffect(() => {
    setData(getCollection<Order>(STORAGE_KEYS.orders));
  }, []);

  const filteredData = React.useMemo(() => {
    return data.filter((o) => {
      if (dateFrom || dateTo) {
        const d = parseISO(o.date);
        if (dateFrom && d < startOfDay(dateFrom)) return false;
        if (dateTo && d > endOfDay(dateTo)) return false;
      }
      if (
        filterOrigin.trim() &&
        !o.origin.toLowerCase().includes(filterOrigin.trim().toLowerCase())
      )
        return false;
      if (
        filterDestination.trim() &&
        !o.destination
          .toLowerCase()
          .includes(filterDestination.trim().toLowerCase())
      )
        return false;
      return true;
    });
  }, [data, dateFrom, dateTo, filterOrigin, filterDestination]);

  const hasAdvancedFilter = !!(
    dateFrom ||
    dateTo ||
    filterOrigin ||
    filterDestination
  );

  function resetAdvancedFilters() {
    setDateFrom(undefined);
    setDateTo(undefined);
    setFilterOrigin("");
    setFilterDestination("");
  }

  function handleAdd(values: OrderForm): string | null {
    const dateStr = format(values.date, "yyyy-MM-dd");
    const payload = {
      clientName: values.clientName,
      origin: values.origin,
      destination: values.destination,
      date: dateStr,
      weight: values.weight,
    };
    if (data.some((o) => isDuplicateOrder(o, payload)))
      return t("orders.duplicate");
    const clientId = getOrCreateClientId(values.clientName);
    const newOrder = {
      id: safeRandomId(),
      ...payload,
      ...(clientId ? { clientId } : {}),
      status: "pending",
      ...(values.notes ? { notes: values.notes } : {}),
      stops: (values.stops ?? []).map((s) => s.trim()).filter(Boolean),
    } as unknown as Order;
    const next = [newOrder, ...data];
    setData(next);
    setOrdersToStorage(next);
    log({ action: "create", entity: "order", entityId: newOrder.id, entityLabel: values.clientName, detailKey: "activityLog.details.orderCreated", detailParams: { client: values.clientName } });
    return null;
  }

  function handleEdit(values: OrderForm): string | null {
    if (!editingOrder) return null;
    const dateStr = format(values.date, "yyyy-MM-dd");
    const payload = {
      clientName: values.clientName,
      origin: values.origin,
      destination: values.destination,
      date: dateStr,
      weight: values.weight,
    };
    if (data.some((o) => isDuplicateOrder(o, payload, editingOrder.id)))
      return t("orders.duplicate");
    const clientId = getOrCreateClientId(values.clientName);
    const next = data.map((o) =>
      o.id === editingOrder.id
        ? {
            ...o,
            ...payload,
            ...(clientId ? { clientId } : {}),
            notes: values.notes ?? "",
            stops: (values.stops ?? []).map((s) => s.trim()).filter(Boolean),
          }
        : o,
    );
    setData(next);
    setOrdersToStorage(next);
    log({ action: "update", entity: "order", entityId: editingOrder.id, entityLabel: values.clientName, detailKey: "activityLog.details.orderUpdated", oldValue: { clientName: editingOrder.clientName, origin: editingOrder.origin, destination: editingOrder.destination }, newValue: { clientName: values.clientName, origin: values.origin, destination: values.destination } });
    setEditingOrder(null);
    return null;
  }

  function handleDelete() {
    if (!deletingOrder) return;
    const next = data.filter((o) => o.id !== deletingOrder.id);
    setData(next);
    setOrdersToStorage(next);
    log({ action: "delete", entity: "order", entityId: deletingOrder.id, entityLabel: deletingOrder.clientName, detailKey: "activityLog.details.orderDeleted" });
    setDeleteOpen(false);
    setDeletingOrder(null);
  }

  function handleImport(rows: Partial<Order>[]) {
    let added = 0;
    let skipped = 0;
    const current = getCollection<Order>(STORAGE_KEYS.orders);
    const next = [...current];

    for (const row of rows) {
      const payload = {
        clientName: row.clientName ?? "",
        origin: row.origin ?? "",
        destination: row.destination ?? "",
        date: row.date ?? "",
        weight: row.weight ?? 0,
      };
      if (next.some((o) => isDuplicateOrder(o, payload))) {
        skipped++;
        continue;
      }
      const newOrder: Order = {
        id: safeRandomId(),
        ...payload,
        status: row.status ?? "pending",
        ...(row.notes ? { notes: row.notes } : {}),
      };
      next.unshift(newOrder);
      added++;
    }

    setData(next);
    setOrdersToStorage(next);

    if (added > 0 && skipped === 0) {
      toast.success(t("orders.import.toastSuccess", { count: added }));
    } else if (added > 0 && skipped > 0) {
      toast.success(t("orders.import.toastPartial", { added, skipped }));
    } else {
      toast.error(t("orders.import.toastAllSkipped"));
    }
    if (added > 0) {
      log({ action: "create", entity: "order", entityId: "import", entityLabel: `Import (${added})`, detailKey: "activityLog.details.orderImported", detailParams: { count: String(added) } });
    }
  }

  const openEdit = React.useCallback((order: Order) => {
    setEditingOrder(order);
    setEditOpen(true);
  }, []);
  const openDelete = React.useCallback((order: Order) => {
    setDeletingOrder(order);
    setDeleteOpen(true);
  }, []);
  const openDetail = React.useCallback((order: Order) => {
    setDetailOrder(order);
    setDetailOpen(true);
  }, []);

  const editInitialValues: OrderForm | undefined = editingOrder
    ? {
        clientName: editingOrder.clientName,
        origin: editingOrder.origin,
        destination: editingOrder.destination,
        date: new Date(editingOrder.date),
        weight: editingOrder.weight ?? 1,
        notes: editingOrder.notes ?? "",
        stops: editingOrder.stops ?? [],
      }
    : undefined;

  const columns = React.useMemo(
    () => getOrderColumns(t, statusMeta, { openDetail, openEdit, openDelete }),
    [t, statusMeta, openDetail, openEdit, openDelete],
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, columnFilters, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10, pageIndex: 0 } },
    columnResizeMode: "onChange",
  });

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("orders.title")}</h1>
      </Header>

      <Main>
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>{t("orders.manage")}</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <OrderExportMenu orders={filteredData} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportOpen(true)}
              >
                <Upload className="mr-1 h-3.5 w-3.5" />
                {t("orders.import.button")}
              </Button>
              <OrderFormDialog
                open={addOpen}
                onOpenChange={setAddOpen}
                title={t("orders.add")}
                onSave={handleAdd}
                triggerButton={<Button>{t("orders.add")}</Button>}
              />
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <DataTableToolbar
              table={table}
              searchPlaceholder={t("orders.placeholders.search")}
              searchKey="clientName"
              columnLabels={{
                clientName: t("orders.fields.client"),
                origin: t("orders.fields.origin"),
                destination: t("orders.fields.destination"),
                stops: t("orders.fields.stops"),
                date: t("orders.fields.date"),
                status: t("orders.fields.status"),
                weight: t("orders.fields.weight"),
              }}
              filters={[
                {
                  columnId: "status",
                  title: t("orders.fields.status"),
                  options: statusFilterOptions,
                },
              ]}
            />

            <AdvancedFilters
              dateFrom={dateFrom}
              dateTo={dateTo}
              origin={filterOrigin}
              destination={filterDestination}
              onDateFrom={setDateFrom}
              onDateTo={setDateTo}
              onOrigin={setFilterOrigin}
              onDestination={setFilterDestination}
              onReset={resetAdvancedFilters}
              hasActive={hasAdvancedFilter}
            />

            <div className="rounded-lg border">
              <Table className="table-fixed">
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          style={{ width: header.getSize() }}
                          className={
                            header.column.id === "weight"
                              ? "!text-center"
                              : undefined
                          }
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            style={{ width: cell.column.getSize() }}
                            className={
                              cell.column.id === "weight"
                                ? "!text-center"
                                : undefined
                            }
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center text-muted-foreground"
                      >
                        {t("orders.noResults")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <DataTablePagination table={table} pageSizes={[10, 20, 50]} />
          </CardContent>
        </Card>
      </Main>

      <OrderImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={handleImport}
      />

      <OrderFormDialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) setEditingOrder(null);
        }}
        title={t("orders.edit")}
        initialValues={editInitialValues}
        onSave={handleEdit}
      />

      <OrderDetailDialog
        order={detailOrder}
        open={detailOpen}
        onOpenChange={(v) => {
          setDetailOpen(v);
          if (!v) setDetailOrder(null);
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(v) => {
          setDeleteOpen(v);
          if (!v) setDeletingOrder(null);
        }}
        title={t("orders.delete")}
        desc={
          deletingOrder ? (
            <span>
              {t("orders.confirmDelete", {
                name: deletingOrder.clientName,
                origin: deletingOrder.origin,
                destination: deletingOrder.destination,
                date: deletingOrder.date,
              })}
            </span>
          ) : (
            t("orders.confirmDeleteFallback")
          )
        }
        confirmText={t("orders.actions.delete")}
        cancelBtnText={t("orders.cancel")}
        destructive
        handleConfirm={handleDelete}
      />
    </>
  );
}
