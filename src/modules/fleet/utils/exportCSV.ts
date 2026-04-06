import Papa from "papaparse";
import { FuelRecord } from "@/modules/fleet/types";
import { Truck } from "@/modules/transport/types";

export function exportFuelToCSV(
  records: FuelRecord[],
  trucks: Truck[],
  t: (k: string) => string,
): void {
  const getTruckLabel = (id: string) => {
    const tr = trucks.find((tr) => tr.id === id);
    return tr ? `${tr.plateNumber} - ${tr.brand} ${tr.model}` : id;
  };

  const data = records.map((r) => ({
    [t("fleet.fuel.exportColumnTruck")]: getTruckLabel(r.truckId),
    [t("fleet.fuel.exportColumnDate")]: r.date,
    [t("fleet.fuel.exportColumnLiters")]: r.liters,
    [t("fleet.fuel.exportColumnCost")]: r.cost,
    [t("fleet.fuel.exportColumnKm")]: r.mileage,
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
