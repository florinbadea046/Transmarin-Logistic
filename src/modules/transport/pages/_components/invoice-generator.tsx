import * as React from "react";
import { useTranslation } from "react-i18next";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FileText, Download, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { Trip, Order } from "@/modules/transport/types";
import { getCollection, addItem, generateId } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";

export interface TripInvoice {
  id: string;
  number: string;
  tripId: string;
  orderId: string;
  clientName: string;
  route: string;
  km: number;
  transportCost: number;
  vatRate: number;
  vatAmount: number;
  totalWithVat: number;
  status: "emisa" | "platita" | "anulata";
  createdAt: string;
}

interface InvoiceGeneratorProps {
  trip: Trip;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvoiceSaved: () => void;
}

function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const existing = getCollection<TripInvoice>(STORAGE_KEYS.tripInvoices);
  const count = existing.length + 1;
  return `TML-${year}-${String(count).padStart(3, "0")}`;
}

export function InvoiceGenerator({
  trip,
  open,
  onOpenChange,
  onInvoiceSaved,
}: InvoiceGeneratorProps) {
  const { t } = useTranslation();

  const orders = getCollection<Order>(STORAGE_KEYS.orders);
  const order = orders.find((o) => o.id === trip.orderId);

  const transportCost = trip.revenue ?? 0;
  const vatRate = 0.19;
  const vatAmount = Math.round(transportCost * vatRate * 100) / 100;
  const totalWithVat = Math.round((transportCost + vatAmount) * 100) / 100;
  const route = order ? `${order.origin} → ${order.destination}` : "-";
  const routePdf = order ? `${order.origin} - ${order.destination}` : "-";
  const km = trip.kmLoaded + trip.kmEmpty;

  const [savedCount, setSavedCount] = React.useState(0);

  const existingInvoices = React.useMemo(() => {
    const all = getCollection<TripInvoice>(STORAGE_KEYS.tripInvoices);
    return all.filter((inv) => inv.tripId === trip.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.id, savedCount]);

  const invoiceNumber = React.useMemo(() => generateInvoiceNumber(), []);

  function handleSaveInvoice() {
    const invoice: TripInvoice = {
      id: generateId(),
      number: invoiceNumber,
      tripId: trip.id,
      orderId: trip.orderId,
      clientName: order?.clientName ?? trip.orderId,
      route: routePdf,
      km,
      transportCost,
      vatRate: 19,
      vatAmount,
      totalWithVat,
      status: "emisa",
      createdAt: new Date().toISOString().split("T")[0],
    };
    addItem<TripInvoice>(STORAGE_KEYS.tripInvoices, invoice);
    onInvoiceSaved();
    setSavedCount((c) => c + 1);
  }

  function handleExportPDF(invoice?: TripInvoice) {
    const inv = invoice ?? {
      number: invoiceNumber,
      clientName: order?.clientName ?? trip.orderId,
      route: routePdf,
      km,
      transportCost,
      vatAmount,
      totalWithVat,
      createdAt: new Date().toISOString().split("T")[0],
    };

    const doc = new jsPDF();

    doc.setFillColor(30, 30, 30);
    doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(t("invoiceGenerator.companyName"), 14, 14);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(t("invoiceGenerator.companyTagline"), 14, 22);

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(t("invoiceGenerator.preview.title"), 14, 46);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`${t("invoiceGenerator.preview.number")}: ${inv.number}`, 14, 56);
    doc.text(`${t("invoiceGenerator.preview.date")}: ${inv.createdAt}`, 14, 63);

    doc.setFont("helvetica", "bold");
    doc.text(t("invoiceGenerator.preview.billTo"), 14, 76);
    doc.setFont("helvetica", "normal");
    doc.text(inv.clientName, 14, 83);
    doc.text(
      `${t("invoiceGenerator.preview.route")}: ${inv.route.replace(/→/g, "-")}`,
      14,
      90,
    );

    autoTable(doc, {
      startY: 100,
      head: [
        [
          t("invoiceGenerator.table.description"),
          t("invoiceGenerator.table.km"),
          t("invoiceGenerator.table.unitPrice"),
          t("invoiceGenerator.table.total"),
        ],
      ],
      body: [
        [
          t("invoiceGenerator.table.transportService"),
          String(inv.km),
          `${inv.transportCost.toLocaleString()} RON`,
          `${inv.transportCost.toLocaleString()} RON`,
        ],
      ],
      headStyles: { fillColor: [30, 30, 30] },
      styles: { fontSize: 10 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(10);
    doc.text(`${t("invoiceGenerator.preview.subtotal")}:`, 130, finalY);
    doc.text(`${inv.transportCost.toLocaleString()} RON`, 175, finalY, {
      align: "right",
    });

    doc.text(`${t("invoiceGenerator.preview.vat")}:`, 130, finalY + 8);
    doc.text(`${inv.vatAmount.toLocaleString()} RON`, 175, finalY + 8, {
      align: "right",
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`${t("invoiceGenerator.preview.total")}:`, 130, finalY + 18);
    doc.text(`${inv.totalWithVat.toLocaleString()} RON`, 175, finalY + 18, {
      align: "right",
    });

    doc.save(`${inv.number}.pdf`);
  }

  const statusColors: Record<TripInvoice["status"], string> = {
    emisa:
      "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
    platita:
      "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400",
    anulata:
      "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-[680px] overflow-y-auto max-h-[90dvh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t("invoiceGenerator.title")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("invoiceGenerator.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t("invoiceGenerator.preview.title")}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {invoiceNumber}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">
                  {t("invoiceGenerator.preview.client")}
                </span>
                <p className="font-medium">
                  {order?.clientName ?? trip.orderId}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">
                  {t("invoiceGenerator.preview.route")}
                </span>
                <p className="font-medium">{route}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">
                  {t("invoiceGenerator.preview.km")}
                </span>
                <p className="font-medium">{km.toLocaleString()} km</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">
                  {t("invoiceGenerator.preview.date")}
                </span>
                <p className="font-medium">
                  {new Date().toISOString().split("T")[0]}
                </p>
              </div>
            </div>

            <div className="border-t pt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("invoiceGenerator.preview.subtotal")}
                </span>
                <span>{transportCost.toLocaleString()} RON</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("invoiceGenerator.preview.vat")}
                </span>
                <span>{vatAmount.toLocaleString()} RON</span>
              </div>
              <div className="flex justify-between font-semibold text-base border-t pt-1 mt-1">
                <span>{t("invoiceGenerator.preview.total")}</span>
                <span>{totalWithVat.toLocaleString()} RON</span>
              </div>
            </div>
          </div>

          {existingInvoices.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {t("invoiceGenerator.existingInvoices")}
              </p>
              <div className="rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          {t("invoiceGenerator.table.number")}
                        </TableHead>
                        <TableHead>
                          {t("invoiceGenerator.table.date")}
                        </TableHead>
                        <TableHead>
                          {t("invoiceGenerator.table.total")}
                        </TableHead>
                        <TableHead>
                          {t("invoiceGenerator.table.status")}
                        </TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {existingInvoices.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono text-xs">
                            {inv.number}
                          </TableCell>
                          <TableCell className="text-sm">
                            {inv.createdAt}
                          </TableCell>
                          <TableCell className="text-sm tabular-nums">
                            {inv.totalWithVat.toLocaleString()} RON
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColors[inv.status]}`}
                            >
                              {t(`invoiceGenerator.status.${inv.status}`)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => handleExportPDF(inv)}
                              title={t("invoiceGenerator.exportPdf")}
                              className="h-6 w-6 flex items-center justify-center rounded-md border border-border/50 bg-transparent hover:bg-muted transition-colors"
                            >
                              <Download className="h-3 w-3 text-muted-foreground" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 pt-4 border-t flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            className="w-full sm:w-auto text-muted-foreground hover:text-foreground"
            onClick={() => onOpenChange(false)}
          >
            <X className="mr-2 h-4 w-4" />
            {t("invoiceGenerator.cancel")}
          </Button>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => handleExportPDF()}
            >
              <Download className="mr-2 h-4 w-4" />
              {t("invoiceGenerator.exportPdf")}
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={handleSaveInvoice}
            >
              <FileText className="mr-2 h-4 w-4" />
              {t("invoiceGenerator.generate")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
