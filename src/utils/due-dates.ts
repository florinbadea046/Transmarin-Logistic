import { Invoice } from "@/modules/accounting/types";
import { differenceInDays, parseISO } from "date-fns";

export function getInvoiceDueStatus(invoice: Invoice) {
  if (invoice.status === "paid") return "paid";

  const today = new Date();
  const due = parseISO(invoice.dueDate);

  const diff = differenceInDays(due, today);

  if (diff < 0) return "overdue";
  if (diff <= 3) return "due_soon";
  return "ok";
}

export function getUnpaidSortedInvoices(invoices: Invoice[]) {
  return invoices
    .filter((inv) => inv.status !== "paid")
    .sort(
      (a, b) =>
        new Date(a.dueDate).getTime() -
        new Date(b.dueDate).getTime()
    );
}

export function getStatusColor(status: string) {
  switch (status) {
    case "overdue":
      return "text-red-500 font-semibold";
    case "due_soon":
      return "text-yellow-500 font-semibold";
    case "ok":
      return "text-green-500";
    default:
      return "text-gray-400";
  }
}