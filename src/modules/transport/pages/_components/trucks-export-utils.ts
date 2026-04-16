import type { Driver, Truck } from "@/modules/transport/types";
import { exportToPdf, exportToExcel, exportToCsv } from "@/utils/exports";

function buildColumns(drivers: Driver[], t: (k: string) => string) {
  const getDriverName = (tr: Truck) =>
    drivers.find((d) => d.truckId === tr.id)?.name ?? "—";

  return [
    { header: t("trucks.columns.plateNumber"), accessor: (tr: Truck) => tr.plateNumber },
    { header: t("trucks.fields.brand"), accessor: (tr: Truck) => tr.brand },
    { header: t("trucks.fields.model"), accessor: (tr: Truck) => tr.model },
    { header: t("trucks.fields.year"), accessor: (tr: Truck) => tr.year },
    { header: t("trucks.columns.status"), accessor: (tr: Truck) => t(`trucks.status.${tr.status}`) },
    { header: t("trucks.columns.itpExpiry"), accessor: (tr: Truck) => tr.itpExpiry },
    { header: t("trucks.columns.rcaExpiry"), accessor: (tr: Truck) => tr.rcaExpiry },
    { header: t("trucks.columns.vignetteExpiry"), accessor: (tr: Truck) => tr.vignetteExpiry },
    { header: t("trucks.columns.driver"), accessor: (tr: Truck) => getDriverName(tr) },
  ];
}

export function exportTrucksPDF(trucks: Truck[], drivers: Driver[], t: (k: string) => string) {
  return exportToPdf({
    filename: t("trucks.export.filename"),
    title: t("trucks.export.pdfTitle"),
    columns: buildColumns(drivers, t),
    rows: trucks,
  });
}

export function exportTrucksExcel(trucks: Truck[], drivers: Driver[], t: (k: string) => string) {
  return exportToExcel({
    filename: t("trucks.export.filename"),
    sheetName: t("trucks.export.sheetName"),
    columns: buildColumns(drivers, t),
    rows: trucks,
  });
}

export function exportTrucksCSV(trucks: Truck[], drivers: Driver[], t: (k: string) => string) {
  return exportToCsv({
    filename: t("trucks.export.filename"),
    columns: buildColumns(drivers, t),
    rows: trucks,
  });
}
