import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import type { Driver, Truck } from "@/modules/transport/types";

import { stripD } from "./transport-shared-utils";

// ── Export Camioane ────────────────────────────────────────

export function exportTrucksPDF(trucks: Truck[], drivers: Driver[], t: (k: string) => string) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(stripD(t("trucks.export.pdfTitle")), 14, 16);
  autoTable(doc, {
    head: [[
      t("trucks.columns.plateNumber"), t("trucks.fields.brand"), t("trucks.fields.model"),
      t("trucks.fields.year"), t("trucks.columns.status"),
      t("trucks.columns.itpExpiry"), t("trucks.columns.rcaExpiry"), t("trucks.columns.vignetteExpiry"),
      t("trucks.columns.driver"),
    ].map(stripD)],
    body: trucks.map((tr) => {
      const driver = drivers.find((d) => d.truckId === tr.id);
      return [
        tr.plateNumber, tr.brand, tr.model, String(tr.year),
        t(`trucks.status.${tr.status}`),
        tr.itpExpiry, tr.rcaExpiry, tr.vignetteExpiry,
        driver?.name ?? "—",
      ].map(stripD);
    }),
    startY: 22, styles: { fontSize: 7 }, headStyles: { fillColor: [30, 30, 30] },
  });
  doc.save(`${t("trucks.export.filename")}.pdf`);
}

export function exportTrucksExcel(trucks: Truck[], drivers: Driver[], t: (k: string) => string) {
  const rows = trucks.map((tr) => {
    const driver = drivers.find((d) => d.truckId === tr.id);
    return {
      [t("trucks.columns.plateNumber")]: tr.plateNumber,
      [t("trucks.fields.brand")]: tr.brand,
      [t("trucks.fields.model")]: tr.model,
      [t("trucks.fields.year")]: tr.year,
      [t("trucks.columns.status")]: t(`trucks.status.${tr.status}`),
      [t("trucks.columns.itpExpiry")]: tr.itpExpiry,
      [t("trucks.columns.rcaExpiry")]: tr.rcaExpiry,
      [t("trucks.columns.vignetteExpiry")]: tr.vignetteExpiry,
      [t("trucks.columns.driver")]: driver?.name ?? "—",
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Camioane");
  XLSX.writeFile(wb, `${t("trucks.export.filename")}.xlsx`);
}

export function exportTrucksCSV(trucks: Truck[], drivers: Driver[], t: (k: string) => string) {
  const rows = trucks.map((tr) => {
    const driver = drivers.find((d) => d.truckId === tr.id);
    return {
      [t("trucks.columns.plateNumber")]: tr.plateNumber,
      [t("trucks.fields.brand")]: tr.brand,
      [t("trucks.fields.model")]: tr.model,
      [t("trucks.fields.year")]: tr.year,
      [t("trucks.columns.status")]: t(`trucks.status.${tr.status}`),
      [t("trucks.columns.itpExpiry")]: tr.itpExpiry,
      [t("trucks.columns.rcaExpiry")]: tr.rcaExpiry,
      [t("trucks.columns.vignetteExpiry")]: tr.vignetteExpiry,
      [t("trucks.columns.driver")]: driver?.name ?? "—",
    };
  });
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${t("trucks.export.filename")}.csv`; a.click();
  URL.revokeObjectURL(url);
}
