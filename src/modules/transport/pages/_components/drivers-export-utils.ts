import type { Driver, Truck } from "@/modules/transport/types";
import { exportToPdf, exportToExcel, exportToCsv } from "@/utils/exports";

function buildColumns(trucks: Truck[], t: (k: string) => string) {
  const getTruckPlate = (d: Driver) =>
    trucks.find((tr) => tr.id === d.truckId)?.plateNumber ?? "—";

  return [
    { header: t("drivers.columns.name"), accessor: (d: Driver) => d.name },
    { header: t("drivers.columns.phone"), accessor: (d: Driver) => d.phone },
    { header: t("drivers.columns.licenseExpiry"), accessor: (d: Driver) => d.licenseExpiry },
    { header: t("drivers.columns.status"), accessor: (d: Driver) => t(`drivers.status.${d.status}`) },
    { header: t("drivers.columns.truck"), accessor: (d: Driver) => getTruckPlate(d) },
  ];
}

export function exportDriversPDF(drivers: Driver[], trucks: Truck[], t: (k: string) => string) {
  exportToPdf({
    filename: t("drivers.export.filename"),
    title: t("drivers.export.pdfTitle"),
    columns: buildColumns(trucks, t),
    rows: drivers,
  });
}

export function exportDriversExcel(drivers: Driver[], trucks: Truck[], t: (k: string) => string) {
  exportToExcel({
    filename: t("drivers.export.filename"),
    sheetName: t("drivers.export.sheetName"),
    columns: buildColumns(trucks, t),
    rows: drivers,
  });
}

export function exportDriversCSV(drivers: Driver[], trucks: Truck[], t: (k: string) => string) {
  exportToCsv({
    filename: t("drivers.export.filename"),
    columns: buildColumns(trucks, t),
    rows: drivers,
  });
}
