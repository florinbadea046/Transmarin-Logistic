import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ServiceRecord } from "@/modules/fleet/types";
import { Truck } from "@/modules/transport/types";
import { getTypeLabels } from "@/modules/fleet/utils/serviceUtils";


export interface ServiceExportFilters {
  truckId?: string;
  fromDate?: string;
  toDate?: string;
}

export function exportServiceToPDF(
  records: ServiceRecord[],
  trucks: Truck[],
  t: (k: string, opts?: Record<string, unknown>) => string,
  filters?: ServiceExportFilters
): void {
  const typeLabels = getTypeLabels(t);

  const getTruckLabel = (id: string) => {
    const tr = trucks.find((tr) => tr.id === id);
    return tr ? `${tr.plateNumber} — ${tr.brand} ${tr.model}` : id;
  };

  let filtered = [...records];
  if (filters?.truckId) filtered = filtered.filter((r) => r.truckId === filters.truckId);
  if (filters?.fromDate) filtered = filtered.filter((r) => r.date >= filters.fromDate!);
  if (filters?.toDate) filtered = filtered.filter((r) => r.date <= filters.toDate!);
  filtered.sort((a, b) => a.date.localeCompare(b.date));

  const totalCost = filtered.reduce((sum, r) => sum + r.cost, 0);
  const today = new Date().toLocaleDateString("ro-RO");

  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(t("fleet.service.exportTitle"), 14, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    t("fleet.service.exportGenerated", { date: today, count: filtered.length } as Record<string, unknown>),
    14,
    26,
  );

  if (filters?.truckId || filters?.fromDate || filters?.toDate) {
    const filterParts = [
      filters.truckId ? t("fleet.service.exportFilterTruck", { truck: getTruckLabel(filters.truckId) } as Record<string, unknown>) : null,
      filters.fromDate ? t("fleet.service.exportFilterFrom", { date: filters.fromDate } as Record<string, unknown>) : null,
      filters.toDate ? t("fleet.service.exportFilterTo", { date: filters.toDate } as Record<string, unknown>) : null,
    ].filter(Boolean).join("   |   ");
    doc.text(t("fleet.service.exportFilters", { filters: filterParts } as Record<string, unknown>), 14, 32);
  }

  autoTable(doc, {
    startY: filters?.truckId || filters?.fromDate || filters?.toDate ? 38 : 32,
    head: [[
      t("fleet.service.exportHeadTruck"),
      t("fleet.service.exportHeadDate"),
      t("fleet.service.exportHeadType"),
      t("fleet.service.exportHeadDescription"),
      t("fleet.service.exportHeadKm"),
      t("fleet.service.exportHeadCost"),
      t("fleet.service.exportHeadNext"),
    ]],
    body: filtered.map((r) => [
      getTruckLabel(r.truckId),
      r.date,
      typeLabels[r.type],
      r.description,
      r.mileageAtService.toLocaleString("ro-RO"),
      r.cost.toLocaleString("ro-RO"),
      r.nextServiceDate ?? "—",
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    foot: [["", "", "", "", t("fleet.service.exportTotal"), `${totalCost.toLocaleString("ro-RO")} RON`, ""]],
    footStyles: { fontStyle: "bold", fillColor: [240, 240, 240] },
  });

  doc.save(`registru-service-${new Date().toISOString().split("T")[0]}.pdf`);
}
