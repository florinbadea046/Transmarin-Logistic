import type { Order, Trip } from "@/modules/transport/types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Papa from "papaparse";

function getExportOrderCols(t: (k: string) => string) {
  return [
    { key: "clientName", label: t("orders.fields.client") },
    { key: "origin", label: t("orders.fields.origin") },
    { key: "destination", label: t("orders.fields.destination") },
    { key: "date", label: t("orders.fields.date") },
    { key: "status", label: t("orders.fields.status") },
    { key: "weight", label: t("orders.fields.weight") },
    { key: "notes", label: t("orders.fields.notes") },
  ];
}

function getExportTripCols(t: (k: string) => string) {
  return [
    { key: "id", label: "ID" },
    { key: "orderId", label: t("trips.fields.orderId") },
    { key: "driverId", label: t("trips.fields.driverId") },
    { key: "truckId", label: t("trips.fields.truckId") },
    { key: "date", label: t("trips.fields.date") },
    { key: "kmLoaded", label: t("trips.fields.kmLoaded") },
    { key: "kmEmpty", label: t("trips.fields.kmEmpty") },
    { key: "fuelCost", label: t("trips.fields.fuelCost") },
    { key: "status", label: t("trips.fields.status") },
  ];
}

function toRows<T>(items: T[], cols: { key: string; label: string }[]) {
  return items.map((item) =>
    Object.fromEntries(cols.map((c) => [c.label, (item as any)[c.key] ?? ""])),
  );
}

export function exportOrdersPDF(orders: Order[], t: (k: string) => string) {
  const cols = getExportOrderCols(t);
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(t("orders.manage"), 14, 16);
  autoTable(doc, {
    head: [cols.map((c) => c.label)],
    body: orders.map((o) => cols.map((c) => String((o as any)[c.key] ?? ""))),
    startY: 22,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 30, 30] },
  });
  doc.save("comenzi.pdf");
}

export function exportOrdersExcel(orders: Order[], t: (k: string) => string) {
  const cols = getExportOrderCols(t);
  const ws = XLSX.utils.json_to_sheet(toRows(orders, cols));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, t("orders.title"));
  XLSX.writeFile(wb, "comenzi.xlsx");
}

export function exportOrdersCSV(orders: Order[], t: (k: string) => string) {
  const cols = getExportOrderCols(t);
  const csv = Papa.unparse(toRows(orders, cols));
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "comenzi.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function exportTripsPDF(trips: Trip[], t: (k: string) => string) {
  const cols = getExportTripCols(t);
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(t("trips.title"), 14, 16);
  autoTable(doc, {
    head: [cols.map((c) => c.label)],
    body: trips.map((tr) => cols.map((c) => String((tr as any)[c.key] ?? ""))),
    startY: 22,
    styles: { fontSize: 7 },
    headStyles: { fillColor: [30, 30, 30] },
  });
  doc.save("curse.pdf");
}

export function exportTripsExcel(trips: Trip[], t: (k: string) => string) {
  const cols = getExportTripCols(t);
  const ws = XLSX.utils.json_to_sheet(toRows(trips, cols));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, t("trips.title"));
  XLSX.writeFile(wb, "curse.xlsx");
}

export function exportTripsCSV(trips: Trip[], t: (k: string) => string) {
  const cols = getExportTripCols(t);
  const csv = Papa.unparse(toRows(trips, cols));
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "curse.csv";
  a.click();
  URL.revokeObjectURL(url);
}
