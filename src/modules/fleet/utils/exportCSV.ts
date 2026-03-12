import Papa from "papaparse";
import { FuelRecord } from "@/modules/fleet/types";
import { Truck } from "@/modules/transport/types";

export function exportFuelToCSV(records: FuelRecord[], trucks: Truck[]): void {
  const getTruckLabel = (id: string) => {
    const t = trucks.find((t) => t.id === id);
    return t ? `${t.plateNumber} - ${t.brand} ${t.model}` : id;
  };

  const data = records.map((r) => ({
    Camion: getTruckLabel(r.truckId),
    Dată: r.date,
    Litri: r.liters,
    "Cost (RON)": r.cost,
    Km: r.mileage,
  }));

  const csv = Papa.unparse(data);
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `alimentari-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}