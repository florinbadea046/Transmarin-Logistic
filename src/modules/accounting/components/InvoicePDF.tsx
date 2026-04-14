// accounting/components/InvoicePDF.tsx
// D15 - Buton "Descarcă PDF" (doar componente React — fără export non-component)

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { generateInvoicePDF } from "./invoice-pdf.utils";
import type { InvoiceData } from "./invoice-pdf.utils";

export type { InvoiceData, InvoiceLineItem } from "./invoice-pdf.utils";

interface InvoicePDFButtonProps {
  invoice: InvoiceData;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export default function InvoicePDFButton({
  invoice,
  variant = "outline",
  size = "sm",
  className,
}: InvoicePDFButtonProps) {
  const { t } = useTranslation();
  const isIconOnly = size === "icon";

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => generateInvoicePDF(invoice, t)}
      title={t("pdf.labels.downloadPdf")}
    >
      <Download className={isIconOnly ? "h-4 w-4" : "h-4 w-4 mr-1.5"} />
      {!isIconOnly && t("pdf.labels.downloadPdf")}
    </Button>
  );
}