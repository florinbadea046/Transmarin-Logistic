import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ServiceRecord } from "@/modules/fleet/types";
import { Truck } from "@/modules/transport/types";
import { TYPE_LABELS } from "@/modules/fleet/utils/serviceUtils";


export interface ServiceExportFilters {
  truckId?: string;
  fromDate?: string;
  toDate?: string;
}

export function exportServiceToPDF(
  records: ServiceRecord[],
  trucks: Truck[],
  filters?: ServiceExportFilters
): void {
  const getTruckLabel = (id: string) => {
    const t = trucks.find((t) => t.id === id);
    return t ? `${t.plateNumber} — ${t.brand} ${t.model}` : id;
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
  doc.text("Registru Service", 14, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generat la: ${today}  |  Total înregistrări: ${filtered.length}`, 14, 26);

  if (filters?.truckId || filters?.fromDate || filters?.toDate) {
    const filterParts = [
      filters.truckId ? `Camion: ${getTruckLabel(filters.truckId)}` : null,
      filters.fromDate ? `De la: ${filters.fromDate}` : null,
      filters.toDate ? `Până la: ${filters.toDate}` : null,
    ].filter(Boolean).join("   |   ");
    doc.text(`Filtre: ${filterParts}`, 14, 32);
  }

  autoTable(doc, {
    startY: filters?.truckId || filters?.fromDate || filters?.toDate ? 38 : 32,
    head: [["Camion", "Dată", "Tip", "Descriere", "Km", "Cost (RON)", "Următor service"]],
    body: filtered.map((r) => [
      getTruckLabel(r.truckId),
      r.date,
      TYPE_LABELS[r.type],
      r.description,
      r.mileageAtService.toLocaleString("ro-RO"),
      r.cost.toLocaleString("ro-RO"),
      r.nextServiceDate ?? "—",
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    foot: [["", "", "", "", "TOTAL", `${totalCost.toLocaleString("ro-RO")} RON`, ""]],
    footStyles: { fontStyle: "bold", fillColor: [240, 240, 240] },
  });

  doc.save(`registru-service-${new Date().toISOString().split("T")[0]}.pdf`);
}