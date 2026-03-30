import * as React from "react";
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
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { PlusCircle } from "lucide-react";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { InvoiceGenerator } from "@/modules/transport/pages/_components/invoice-generator";
import { DataTablePagination } from "@/components/data-table/pagination";
import { DataTableToolbar } from "@/components/data-table/toolbar";

import type { Trip, Driver, Truck, Order } from "@/modules/transport/types";
import { getCollection, updateItem, removeItem } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";

import { TripsExportMenu } from "./_components/trips-export-menu";
import { buildColumns } from "./_components/trips-table-columns";
import { TripMobileList } from "./_components/trips-mobile-card";
import { TripFormDialog } from "./_components/trips-form-dialog";

function useWindowWidth() {
  const [width, setWidth] = React.useState(
    typeof window !== "undefined" ? window.innerWidth : 1024,
  );
  React.useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
}

export default function TripsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  const [data, setData] = React.useState<Trip[]>([]);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [drivers, setDrivers] = React.useState<Driver[]>([]);
  const [trucks, setTrucks] = React.useState<Truck[]>([]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingTrip, setEditingTrip] = React.useState<Trip | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deletingTrip, setDeletingTrip] = React.useState<Trip | null>(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = React.useState(false);
  const [invoiceTrip, setInvoiceTrip] = React.useState<Trip | null>(null);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  const loadData = React.useCallback(() => {
    setData(getCollection<Trip>(STORAGE_KEYS.trips));
    setOrders(getCollection<Order>(STORAGE_KEYS.orders));
    setDrivers(getCollection<Driver>(STORAGE_KEYS.drivers));
    setTrucks(getCollection<Truck>(STORAGE_KEYS.trucks));
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  React.useEffect(() => {
    if (isMobile) {
      setColumnVisibility({
        driverId: false,
        truckId: false,
        route: false,
        kmLoaded: false,
        kmEmpty: false,
        fuelCost: false,
        revenue: false,
        estimatedArrivalDate: false,
      });
    } else if (isTablet) {
      setColumnVisibility({
        truckId: false,
        kmEmpty: false,
        fuelCost: false,
        revenue: false,
        estimatedArrivalDate: false,
      });
    } else {
      setColumnVisibility({});
    }
  }, [isMobile, isTablet]);

  const handleStatusChange = React.useCallback(
    (updatedTrip: Trip) => {
      updateItem<Trip>(
        STORAGE_KEYS.trips,
        (tr) => tr.id === updatedTrip.id,
        () => updatedTrip,
      );
      if (updatedTrip.status === "finalizata") {
        updateItem<Order>(
          STORAGE_KEYS.orders,
          (o) => o.id === updatedTrip.orderId,
          (o) => ({ ...o, status: "delivered" }),
        );
        updateItem<Driver>(
          STORAGE_KEYS.drivers,
          (d) => d.id === updatedTrip.driverId,
          (d) => ({ ...d, status: "available" }),
        );
        toast.success(t("trips.toast.finished"));
      } else if (updatedTrip.status === "anulata") {
        updateItem<Order>(
          STORAGE_KEYS.orders,
          (o) => o.id === updatedTrip.orderId,
          (o) => ({ ...o, status: "cancelled" }),
        );
        updateItem<Driver>(
          STORAGE_KEYS.drivers,
          (d) => d.id === updatedTrip.driverId,
          (d) => ({ ...d, status: "available" }),
        );
        toast.info(t("trips.toast.cancelled"));
      } else if (updatedTrip.status === "in_desfasurare") {
        toast.success(t("trips.toast.started"));
      }
      loadData();
    },
    [loadData, t],
  );

  const handleDeleteRequest = React.useCallback((trip: Trip) => {
    setDeletingTrip(trip);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = React.useCallback(() => {
    if (!deletingTrip) return;
    removeItem<Trip>(STORAGE_KEYS.trips, (tr) => tr.id === deletingTrip.id);
    toast.success(t("trips.toast.deleted"));
    setDeleteDialogOpen(false);
    setDeletingTrip(null);
    loadData();
  }, [deletingTrip, loadData, t]);

  const handleEdit = React.useCallback((trip: Trip) => {
    setEditingTrip(trip);
    setDialogOpen(true);
  }, []);

  const handleGenerateInvoice = React.useCallback((trip: Trip) => {
    setInvoiceTrip(trip);
    setInvoiceDialogOpen(true);
  }, []);

  const statusFilterOptions = (
    ["planned", "in_desfasurare", "finalizata", "anulata"] as Trip["status"][]
  ).map((value) => ({ value, label: t(`trips.status.${value}`) }));

  const columns = React.useMemo(
    () =>
      buildColumns({
        orders,
        drivers,
        trucks,
        allTrips: data,
        onStatusChange: handleStatusChange,
        onEdit: handleEdit,
        onDelete: handleDeleteRequest,
        onGenerateInvoice: handleGenerateInvoice,
        t,
        navigate,
      }),
    [
      orders,
      drivers,
      trucks,
      data,
      handleStatusChange,
      handleEdit,
      handleDeleteRequest,
      handleGenerateInvoice,
      t,
      navigate,
    ],
  );

  const table = useReactTable({
    data,
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
  });

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("trips.title")}</h1>
      </Header>

      <Main>
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base md:text-lg">
              {t("trips.tableTitle")}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Tabs
                value="table"
                onValueChange={(v) => {
                  if (v === "calendar")
                    navigate({ to: "/transport/trips-calendar" });
                  if (v === "map") navigate({ to: "/transport/trips-map" });
                  if (v === "dnd")
                    navigate({ to: "/transport/trips-calendar-dnd" });
                }}
              >
                <TabsList>
                  <TabsTrigger value="table">
                    <span className="hidden sm:inline">
                      {t("tripsCalendar.tabs.table")}
                    </span>
                    <span className="sm:hidden">
                      {t("tripsCalendar.tabs.tableShort")}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="calendar">
                    <span className="hidden sm:inline">
                      {t("tripsCalendar.tabs.calendar")}
                    </span>
                    <span className="sm:hidden">
                      {t("tripsCalendar.tabs.calendarShort")}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="dnd">
                    <span className="hidden sm:inline">
                      {t("tripsDnd.tabs.dnd")}
                    </span>
                    <span className="sm:hidden">
                      {t("tripsDnd.tabs.dndShort")}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="map">
                    <span className="hidden sm:inline">
                      {t("tripsMap.tabs.map")}
                    </span>
                    <span className="sm:hidden">
                      {t("tripsMap.tabs.mapShort")}
                    </span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <TripsExportMenu
                trips={data}
                orders={orders}
                drivers={drivers}
                trucks={trucks}
              />
              <Button
                onClick={() => {
                  setEditingTrip(null);
                  setDialogOpen(true);
                }}
                size="sm"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">{t("trips.add")}</span>
                <span className="sm:hidden">{t("trips.addShort")}</span>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <DataTableToolbar
              table={table}
              searchPlaceholder={t("trips.placeholders.search")}
              searchKey="orderId"
              filters={[
                {
                  columnId: "status",
                  title: t("trips.columns.status"),
                  options: statusFilterOptions,
                },
              ]}
              columnLabels={{
                orderId: t("trips.columns.order"),
                driverId: t("trips.columns.driver"),
                truckId: t("trips.columns.truck"),
                status: t("trips.columns.status"),
                departureDate: t("trips.columns.departureDate"),
                estimatedArrivalDate: t("trips.columns.arrivalDate"),
                kmLoaded: t("trips.columns.kmLoaded"),
                kmEmpty: t("trips.columns.kmEmpty"),
                fuelCost: t("trips.columns.fuelCost"),
                revenue: t("trips.columns.revenue"),
              }}
            />

            {isMobile ? (
              <TripMobileList
                trips={table.getRowModel().rows.map((r) => r.original)}
                orders={orders}
                drivers={drivers}
                onEdit={handleEdit}
                onDelete={handleDeleteRequest}
                onStatusChange={handleStatusChange}
                onGenerateInvoice={handleGenerateInvoice}
                noResultsLabel={t("trips.noResults")}
              />
            ) : (
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead
                            key={header.id}
                            style={{ width: header.getSize() }}
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
                          {t("trips.noResults")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            <DataTablePagination table={table} pageSizes={[5, 10, 20]} />
          </CardContent>
        </Card>
      </Main>

      <TripFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingTrip={editingTrip}
        orders={orders}
        drivers={drivers}
        trucks={trucks}
        onSaved={loadData}
      />

      {invoiceTrip && (
        <InvoiceGenerator
          trip={invoiceTrip}
          open={invoiceDialogOpen}
          onOpenChange={(v) => {
            setInvoiceDialogOpen(v);
            if (!v) setInvoiceTrip(null);
          }}
          onInvoiceSaved={loadData}
        />
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={(v) => {
          setDeleteDialogOpen(v);
          if (!v) setDeletingTrip(null);
        }}
        title={t("trips.delete.title")}
        desc={
          deletingTrip
            ? t("trips.delete.desc", { orderId: deletingTrip.orderId })
            : t("trips.delete.descFallback")
        }
        confirmText={t("trips.delete.confirm")}
        cancelBtnText={t("trips.cancel")}
        destructive
        handleConfirm={handleDeleteConfirm}
      />
    </>
  );
}
