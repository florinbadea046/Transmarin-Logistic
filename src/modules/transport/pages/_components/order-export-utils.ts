import type { Order, Trip } from "@/modules/transport/types";
import { exportToPdf, exportToExcel, exportToCsv } from "@/utils/exports";

function orderColumns(t: (k: string) => string) {
  return [
    { header: t("orders.fields.client"), accessor: (o: Order) => o.clientName ?? "" },
    { header: t("orders.fields.origin"), accessor: (o: Order) => o.origin ?? "" },
    { header: t("orders.fields.destination"), accessor: (o: Order) => o.destination ?? "" },
    { header: t("orders.fields.date"), accessor: (o: Order) => o.date ?? "" },
    { header: t("orders.fields.status"), accessor: (o: Order) => o.status ?? "" },
    { header: t("orders.fields.weight"), accessor: (o: Order) => o.weight ?? "" },
    { header: t("orders.fields.notes"), accessor: (o: Order) => o.notes ?? "" },
  ];
}

function tripColumns(t: (k: string) => string) {
  return [
    { header: "ID", accessor: (tr: Trip) => tr.id ?? "" },
    { header: t("trips.fields.orderId"), accessor: (tr: Trip) => tr.orderId ?? "" },
    { header: t("trips.fields.driverId"), accessor: (tr: Trip) => tr.driverId ?? "" },
    { header: t("trips.fields.truckId"), accessor: (tr: Trip) => tr.truckId ?? "" },
    { header: t("trips.fields.date"), accessor: (tr: Trip) => (tr as unknown as { date?: string }).date ?? "" },
    { header: t("trips.fields.kmLoaded"), accessor: (tr: Trip) => tr.kmLoaded ?? "" },
    { header: t("trips.fields.kmEmpty"), accessor: (tr: Trip) => tr.kmEmpty ?? "" },
    { header: t("trips.fields.fuelCost"), accessor: (tr: Trip) => tr.fuelCost ?? "" },
    { header: t("trips.fields.status"), accessor: (tr: Trip) => tr.status ?? "" },
  ];
}

export function exportOrdersPDF(orders: Order[], t: (k: string) => string) {
  return exportToPdf({
    filename: "comenzi",
    title: t("orders.manage"),
    columns: orderColumns(t),
    rows: orders,
    showHeader: false,
    stripRomanian: false,
  });
}

export function exportOrdersExcel(orders: Order[], t: (k: string) => string) {
  return exportToExcel({
    filename: "comenzi",
    sheetName: t("orders.title"),
    columns: orderColumns(t),
    rows: orders,
    autoWidth: false,
  });
}

export function exportOrdersCSV(orders: Order[], t: (k: string) => string) {
  return exportToCsv({
    filename: "comenzi",
    columns: orderColumns(t),
    rows: orders,
    addBom: false,
  });
}

export function exportTripsPDF(trips: Trip[], t: (k: string) => string) {
  return exportToPdf({
    filename: "curse",
    title: t("trips.title"),
    columns: tripColumns(t),
    rows: trips,
    orientation: "landscape",
    showHeader: false,
    stripRomanian: false,
  });
}

export function exportTripsExcel(trips: Trip[], t: (k: string) => string) {
  return exportToExcel({
    filename: "curse",
    sheetName: t("trips.title"),
    columns: tripColumns(t),
    rows: trips,
    autoWidth: false,
  });
}

export function exportTripsCSV(trips: Trip[], t: (k: string) => string) {
  return exportToCsv({
    filename: "curse",
    columns: tripColumns(t),
    rows: trips,
    addBom: false,
  });
}
