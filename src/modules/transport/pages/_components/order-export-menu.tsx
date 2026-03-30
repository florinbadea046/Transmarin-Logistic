import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Order, Trip } from "@/modules/transport/types";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import {
  exportOrdersPDF,
  exportOrdersExcel,
  exportOrdersCSV,
  exportTripsPDF,
  exportTripsExcel,
  exportTripsCSV,
} from "./order-export-utils";

export function OrderExportMenu({ orders }: { orders: Order[] }) {
  const { t } = useTranslation();
  const trips = getCollection<Trip>(STORAGE_KEYS.trips);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          {t("orders.actions.export")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="cursor-pointer font-medium text-xs text-muted-foreground"
          disabled
        >
          {t("orders.title")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => exportOrdersPDF(orders, t)}
        >
          {t("orders.actions.exportPdf")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => exportOrdersExcel(orders, t)}
        >
          {t("orders.actions.exportExcel")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => exportOrdersCSV(orders, t)}
        >
          {t("orders.actions.exportCsv")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer font-medium text-xs text-muted-foreground"
          disabled
        >
          {t("trips.title")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => exportTripsPDF(trips, t)}
        >
          {t("orders.actions.exportPdf")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => exportTripsExcel(trips, t)}
        >
          {t("orders.actions.exportExcel")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => exportTripsCSV(trips, t)}
        >
          {t("orders.actions.exportCsv")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
