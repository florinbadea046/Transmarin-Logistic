import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import type { Driver, Truck } from "@/modules/transport/types";
import { stripD } from "./transport-shared-utils";

// ── Export Soferi ──────────────────────────────────────────

export function exportDriversPDF(drivers: Driver[], trucks: Truck[], t: (k: string) => string) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(stripD(t("drivers.export.pdfTitle")), 14, 16);
  autoTable(doc, {
    head: [[
      t("drivers.columns.name"), t("drivers.columns.phone"),
      t("drivers.columns.licenseExpiry"), t("drivers.columns.status"), t("drivers.columns.truck"),
    ].map(stripD)],
    body: drivers.map((d) => {
      const truck = trucks.find((tr) => tr.id === d.truckId);
      return [d.name, d.phone, d.licenseExpiry, t(`drivers.status.${d.status}`), truck?.plateNumber ?? "—"].map(stripD);
    }),
    startY: 22, styles: { fontSize: 8 }, headStyles: { fillColor: [30, 30, 30] },
  });
  doc.save(`${t("drivers.export.filename")}.pdf`);
}

export function exportDriversExcel(drivers: Driver[], trucks: Truck[], t: (k: string) => string) {
  const rows = drivers.map((d) => {
    const truck = trucks.find((tr) => tr.id === d.truckId);
    return {
      [t("drivers.columns.name")]: d.name,
      [t("drivers.columns.phone")]: d.phone,
      [t("drivers.columns.licenseExpiry")]: d.licenseExpiry,
      [t("drivers.columns.status")]: t(`drivers.status.${d.status}`),
      [t("drivers.columns.truck")]: truck?.plateNumber ?? "—",
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Soferi");
  XLSX.writeFile(wb, `${t("drivers.export.filename")}.xlsx`);
}

export function exportDriversCSV(drivers: Driver[], trucks: Truck[], t: (k: string) => string) {
  const rows = drivers.map((d) => {
    const truck = trucks.find((tr) => tr.id === d.truckId);
    return {
      [t("drivers.columns.name")]: d.name,
      [t("drivers.columns.phone")]: d.phone,
      [t("drivers.columns.licenseExpiry")]: d.licenseExpiry,
      [t("drivers.columns.status")]: t(`drivers.status.${d.status}`),
      [t("drivers.columns.truck")]: truck?.plateNumber ?? "—",
    };
  });
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${t("drivers.export.filename")}.csv`; a.click();
  URL.revokeObjectURL(url);
}
