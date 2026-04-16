import type { FuelRecord } from "@/modules/fleet/types";
import type { Truck } from "@/modules/transport/types";
import { exportToCsv } from "@/utils/exports";

export function exportFuelToCSV(
  records: FuelRecord[],
  trucks: Truck[],
  t: (k: string) => string,
): void {
  const getTruckLabel = (id: string) => {
    const tr = trucks.find((tr) => tr.id === id);
    return tr ? `${tr.plateNumber} - ${tr.brand} ${tr.model}` : id;
  };

  exportToCsv({
    filename: `alimentari-${new Date().toISOString().split("T")[0]}`,
    columns: [
      { header: t("fleet.fuel.exportColumnTruck"), accessor: (r) => getTruckLabel(r.truckId) },
      { header: t("fleet.fuel.exportColumnDate"), accessor: (r) => r.date },
      { header: t("fleet.fuel.exportColumnLiters"), accessor: (r) => r.liters },
      { header: t("fleet.fuel.exportColumnCost"), accessor: (r) => r.cost },
      { header: t("fleet.fuel.exportColumnKm"), accessor: (r) => r.mileage },
    ],
    rows: records,
  });
}
