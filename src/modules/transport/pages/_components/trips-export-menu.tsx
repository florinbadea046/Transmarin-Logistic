import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Trip, Order, Driver, Truck } from "@/modules/transport/types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Papa from "papaparse";

function toRows(
  trips: Trip[],
  orders: Order[],
  drivers: Driver[],
  trucks: Truck[],
  t: ReturnType<typeof useTranslation>["t"],
) {
  return trips.map((trip, idx) => {
    const order = orders.find((o) => o.id === trip.orderId);
    const driver = drivers.find((d) => d.id === trip.driverId);
    const truck = trucks.find((tr) => tr.id === trip.truckId);
    return {
      [t("trips.export.nr")]: idx + 1,
      [t("trips.export.order")]: order ? order.clientName : trip.orderId,
      [t("trips.export.driver")]: driver?.name ?? trip.driverId,
      [t("trips.export.truck")]: truck ? truck.plateNumber : trip.truckId,
      [t("trips.export.route")]: order
        ? `${order.origin} → ${order.destination}`
        : "—",
      [t("trips.export.departure")]: trip.departureDate,
      [t("trips.export.arrival")]: trip.estimatedArrivalDate,
      [t("trips.export.kmLoaded")]: trip.kmLoaded,
      [t("trips.export.kmEmpty")]: trip.kmEmpty,
      [t("trips.export.fuelCost")]: trip.fuelCost,
      [t("trips.export.revenue")]: trip.revenue ?? 0,
      [t("trips.export.status")]: t(`trips.status.${trip.status}`),
    };
  });
}

export function TripsExportMenu({
  trips,
  orders,
  drivers,
  trucks,
}: {
  trips: Trip[];
  orders: Order[];
  drivers: Driver[];
  trucks: Truck[];
}) {
  const { t } = useTranslation();

  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(t("trips.title"), 14, 16);
    const rows = toRows(trips, orders, drivers, trucks, t);
    autoTable(doc, {
      head: [Object.keys(rows[0] ?? {})],
      body: rows.map((r) => Object.values(r).map(String)),
      startY: 22,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [30, 30, 30] },
    });
    doc.save(`${t("trips.export.filename")}.pdf`);
  }

  function exportExcel() {
    const ws = XLSX.utils.json_to_sheet(
      toRows(trips, orders, drivers, trucks, t),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t("trips.title"));
    XLSX.writeFile(wb, `${t("trips.export.filename")}.xlsx`);
  }

  function exportCSV() {
    const csv = Papa.unparse(toRows(trips, orders, drivers, trucks, t));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${t("trips.export.filename")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          {t("trips.actions.export")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem className="cursor-pointer" onClick={exportPDF}>
          {t("trips.actions.exportPdf")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onClick={exportExcel}>
          {t("trips.actions.exportExcel")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onClick={exportCSV}>
          {t("trips.actions.exportCsv")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
