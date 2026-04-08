import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import {
  getUnpaidSortedInvoices,
  getInvoiceDueStatus,
  getStatusColor,
} from "@/utils/due-dates";
import type { Invoice } from "@/modules/accounting/types";
import { useTranslation } from "react-i18next";

export default function DueDatesPage() {
  const { t } = useTranslation();

  const invoices = getCollection(STORAGE_KEYS.invoices) as Invoice[];
  const data = getUnpaidSortedInvoices(invoices);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">
        {t("accounting.dueDatesTitle")}
      </h1>

      {data.map((inv) => {
        const status = getInvoiceDueStatus(inv);

        return (
          <div
            key={inv.id}
            className={`border p-4 mb-3 rounded-lg transition ${
              status === "overdue"
                ? "bg-red-900/30 border-red-500"
                : status === "due_soon"
                ? "bg-yellow-900/30 border-yellow-500"
                : "bg-gray-900/40 border-gray-700"
            }`}
          >
            <div className="font-semibold text-white">
              {inv.number}
            </div>

            <div className="text-sm text-gray-300">
              {inv.clientName}
            </div>

            <div className="text-sm text-gray-400">
              {t("accounting.dueDate")}: {inv.dueDate}
            </div>

            <div className={`mt-1 text-sm font-medium ${getStatusColor(status)}`}>
              {t("accounting.statusLabel")}:{" "}
              {t(`accounting.status.${status}`)}
            </div>
          </div>
        );
      })}
    </div>
  );
}