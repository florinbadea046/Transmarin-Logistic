import type { Invoice } from "./invoices-types";
import { calcLineTotals } from "./invoices-utils";
import { exportToPdf, exportToExcel, exportToCsv } from "@/utils/exports";

type ExportRow = {
  [key: string]: string;
};

export function getExportRows(
  invoices: Invoice[],
  t: (key: string) => string,
): ExportRow[] {
  return invoices.map((inv) => {
    const { totalFaraTVA, tva, total } = calcLineTotals(inv.linii);

    return {
      [t("invoices.columns.nr")]: inv.nr,
      [t("invoices.columns.clientSupplier")]: inv.clientFurnizor,
      [t("invoices.columns.type")]:
        inv.tip === "venit"
          ? t("invoices.typeLabels.income")
          : t("invoices.typeLabels.expense"),
      [t("invoices.columns.date")]: inv.data,
      [t("invoices.columns.subtotal")]: totalFaraTVA.toFixed(2),
      [t("invoices.columns.vat")]: tva.toFixed(2),
      [t("invoices.columns.total")]: total.toFixed(2),
      [t("invoices.columns.status")]: t(`invoices.statusLabels.${inv.status}`),
    };
  });
}

function buildColumns(t: (key: string) => string) {
  return [
    { header: t("invoices.columns.nr"), accessor: (inv: Invoice) => inv.nr },
    { header: t("invoices.columns.clientSupplier"), accessor: (inv: Invoice) => inv.clientFurnizor },
    {
      header: t("invoices.columns.type"),
      accessor: (inv: Invoice) =>
        inv.tip === "venit"
          ? t("invoices.typeLabels.income")
          : t("invoices.typeLabels.expense"),
    },
    { header: t("invoices.columns.date"), accessor: (inv: Invoice) => inv.data },
    {
      header: t("invoices.columns.subtotal"),
      accessor: (inv: Invoice) => calcLineTotals(inv.linii).totalFaraTVA.toFixed(2),
    },
    {
      header: t("invoices.columns.vat"),
      accessor: (inv: Invoice) => calcLineTotals(inv.linii).tva.toFixed(2),
    },
    {
      header: t("invoices.columns.total"),
      accessor: (inv: Invoice) => calcLineTotals(inv.linii).total.toFixed(2),
    },
    {
      header: t("invoices.columns.status"),
      accessor: (inv: Invoice) => t(`invoices.statusLabels.${inv.status}`),
    },
  ];
}

export function exportPDF(invoices: Invoice[], t: (key: string) => string) {
  return exportToPdf({
    filename: "facturi",
    title: t("invoices.header"),
    subtitle: `${t("invoices.export.invoiceList")} [${new Date().toLocaleDateString("ro-RO")}]`,
    columns: buildColumns(t),
    rows: invoices,
    showHeader: false,
  });
}

export function exportExcel(invoices: Invoice[], t: (key: string) => string) {
  return exportToExcel({
    filename: "facturi",
    sheetName: t("invoices.title"),
    columns: buildColumns(t),
    rows: invoices,
  });
}

export function exportCSV(invoices: Invoice[], t: (key: string) => string) {
  return exportToCsv({
    filename: "facturi",
    columns: buildColumns(t),
    rows: invoices,
  });
}
