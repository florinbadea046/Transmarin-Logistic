import type { ServiceRecord } from "@/modules/fleet/types";
import type { Truck } from "@/modules/transport/types";
import { getTypeLabels } from "@/modules/fleet/utils/serviceUtils";
import { exportToPdf } from "@/utils/exports";

export interface ServiceExportFilters {
  truckId?: string;
  fromDate?: string;
  toDate?: string;
}

export function exportServiceToPDF(
  records: ServiceRecord[],
  trucks: Truck[],
  t: (k: string, opts?: Record<string, unknown>) => string,
  filters?: ServiceExportFilters,
): void {
  const typeLabels = getTypeLabels(t);

  const getTruckLabel = (id: string) => {
    const tr = trucks.find((tr) => tr.id === id);
    return tr ? `${tr.plateNumber} - ${tr.brand} ${tr.model}` : id;
  };

  let filtered = [...records];
  if (filters?.truckId) filtered = filtered.filter((r) => r.truckId === filters.truckId);
  if (filters?.fromDate) filtered = filtered.filter((r) => r.date >= filters.fromDate!);
  if (filters?.toDate) filtered = filtered.filter((r) => r.date <= filters.toDate!);
  filtered.sort((a, b) => a.date.localeCompare(b.date));

  const totalCost = filtered.reduce((sum, r) => sum + r.cost, 0);
  const today = new Date().toLocaleDateString("ro-RO");

  const extraLines: string[] = [
    t("fleet.service.exportGenerated", { date: today, count: filtered.length } as Record<string, unknown>),
  ];

  if (filters?.truckId || filters?.fromDate || filters?.toDate) {
    const filterParts = [
      filters.truckId ? t("fleet.service.exportFilterTruck", { truck: getTruckLabel(filters.truckId) } as Record<string, unknown>) : null,
      filters.fromDate ? t("fleet.service.exportFilterFrom", { date: filters.fromDate } as Record<string, unknown>) : null,
      filters.toDate ? t("fleet.service.exportFilterTo", { date: filters.toDate } as Record<string, unknown>) : null,
    ].filter(Boolean).join("   |   ");
    extraLines.push(t("fleet.service.exportFilters", { filters: filterParts } as Record<string, unknown>));
  }

  exportToPdf({
    filename: `registru-service-${new Date().toISOString().split("T")[0]}`,
    title: t("fleet.service.exportTitle"),
    orientation: "landscape",
    extraLines,
    columns: [
      { header: t("fleet.service.exportHeadTruck"), accessor: (r: ServiceRecord) => getTruckLabel(r.truckId) },
      { header: t("fleet.service.exportHeadDate"), accessor: (r: ServiceRecord) => r.date },
      { header: t("fleet.service.exportHeadType"), accessor: (r: ServiceRecord) => typeLabels[r.type] },
      { header: t("fleet.service.exportHeadDescription"), accessor: (r: ServiceRecord) => r.description },
      { header: t("fleet.service.exportHeadKm"), accessor: (r: ServiceRecord) => r.mileageAtService.toLocaleString("ro-RO") },
      { header: t("fleet.service.exportHeadCost"), accessor: (r: ServiceRecord) => r.cost.toLocaleString("ro-RO") },
      { header: t("fleet.service.exportHeadNext"), accessor: (r: ServiceRecord) => r.nextServiceDate ?? "—" },
    ],
    rows: filtered,
    footerRow: [
      { content: "", colSpan: 4 },
      { content: t("fleet.service.exportTotal"), bold: true, align: "right" },
      { content: `${totalCost.toLocaleString("ro-RO")} RON`, bold: true },
      { content: "" },
    ],
  });
}
