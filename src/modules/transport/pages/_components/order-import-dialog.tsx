import * as React from "react";
import { useTranslation } from "react-i18next";
import Papa from "papaparse";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Order } from "@/modules/transport/types";

type ImportRow = {
  raw: Record<string, string>;
  parsed: Partial<Order> | null;
  errors: string[];
  index: number;
};

function parseImportRow(
  raw: Record<string, string>,
  index: number,
  t: (k: string) => string,
): ImportRow {
  const errors: string[] = [];
  const clientName = raw["Client"]?.trim() || raw["clientName"]?.trim() || "";
  const origin =
    raw["Origine"]?.trim() ||
    raw["Origin"]?.trim() ||
    raw["origin"]?.trim() ||
    "";
  const destination =
    raw["Destinatie"]?.trim() ||
    raw["Destination"]?.trim() ||
    raw["destination"]?.trim() ||
    "";
  const date =
    raw["Data"]?.trim() || raw["Date"]?.trim() || raw["date"]?.trim() || "";
  const weightRaw =
    raw["Greutate (t)"]?.trim() ||
    raw["Weight (t)"]?.trim() ||
    raw["weight"]?.trim() ||
    "";
  const notes =
    raw["Note"]?.trim() || raw["Notes"]?.trim() || raw["notes"]?.trim() || "";
  const statusRaw = raw["Status"]?.trim() || raw["status"]?.trim() || "";

  if (!clientName) errors.push(t("orders.validation.clientRequired"));
  if (!origin) errors.push(t("orders.validation.originRequired"));
  if (!destination) errors.push(t("orders.validation.destinationRequired"));
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    errors.push(t("orders.import.invalidDate"));

  const weight = parseFloat(weightRaw);
  if (!weightRaw || isNaN(weight) || weight <= 0)
    errors.push(t("orders.validation.weightPositive"));

  const validStatuses: Order["status"][] = [
    "pending",
    "assigned",
    "in_transit",
    "delivered",
    "cancelled",
  ];
  const status: Order["status"] = validStatuses.includes(
    statusRaw as Order["status"],
  )
    ? (statusRaw as Order["status"])
    : "pending";

  if (errors.length > 0) {
    return { raw, parsed: null, errors, index };
  }

  return {
    raw,
    parsed: {
      clientName,
      origin,
      destination,
      date,
      weight,
      notes: notes || undefined,
      status,
    },
    errors: [],
    index,
  };
}

export function OrderImportDialog({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImport: (rows: Partial<Order>[]) => void;
}) {
  const { t } = useTranslation();
  const [rows, setRows] = React.useState<ImportRow[]>([]);
  const [step, setStep] = React.useState<"upload" | "preview">("upload");
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) {
      setRows([]);
      setStep("upload");
    }
  }, [open]);

  function handleFile(file: File) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const parsed = (result.data as Record<string, string>[]).map((row, i) =>
          parseImportRow(row, i, t),
        );
        setRows(parsed);
        setStep("preview");
      },
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const validRows = rows.filter((r) => r.errors.length === 0 && r.parsed);
  const invalidRows = rows.filter((r) => r.errors.length > 0);

  function handleConfirm() {
    onImport(validRows.map((r) => r.parsed!));
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[760px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("orders.import.title")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("orders.import.title")}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div
            className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-10 text-center cursor-pointer hover:border-primary transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">{t("orders.import.dropzone")}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("orders.import.dropzoneHint")}
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>
        )}

        {step === "preview" && (
          <div className="flex flex-col gap-3 overflow-hidden">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-green-600 font-medium">
                {t("orders.import.validCount", { count: validRows.length })}
              </span>
              {invalidRows.length > 0 && (
                <span className="text-destructive font-medium">
                  {t("orders.import.invalidCount", {
                    count: invalidRows.length,
                  })}
                </span>
              )}
            </div>

            <div className="overflow-auto rounded-lg border max-h-[50vh]">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>{t("orders.fields.client")}</TableHead>
                    <TableHead>{t("orders.fields.origin")}</TableHead>
                    <TableHead>{t("orders.fields.destination")}</TableHead>
                    <TableHead>{t("orders.fields.date")}</TableHead>
                    <TableHead>{t("orders.fields.weight")}</TableHead>
                    <TableHead>{t("orders.fields.status")}</TableHead>
                    <TableHead>{t("orders.import.errorsCol")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={row.index}
                      className={
                        row.errors.length > 0 ? "bg-destructive/10" : ""
                      }
                    >
                      <TableCell>{row.index + 1}</TableCell>
                      <TableCell>
                        {row.raw["Client"] || row.raw["clientName"] || "—"}
                      </TableCell>
                      <TableCell>
                        {row.raw["Origine"] ||
                          row.raw["Origin"] ||
                          row.raw["origin"] ||
                          "—"}
                      </TableCell>
                      <TableCell>
                        {row.raw["Destinatie"] ||
                          row.raw["Destination"] ||
                          row.raw["destination"] ||
                          "—"}
                      </TableCell>
                      <TableCell>
                        {row.raw["Data"] ||
                          row.raw["Date"] ||
                          row.raw["date"] ||
                          "—"}
                      </TableCell>
                      <TableCell>
                        {row.raw["Greutate (t)"] ||
                          row.raw["Weight (t)"] ||
                          row.raw["weight"] ||
                          "—"}
                      </TableCell>
                      <TableCell>
                        {row.raw["Status"] || row.raw["status"] || "pending"}
                      </TableCell>
                      <TableCell className="text-destructive text-xs">
                        {row.errors.join(", ")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === "preview" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRows([]);
                setStep("upload");
              }}
            >
              {t("orders.import.reupload")}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("orders.cancel")}
          </Button>
          {step === "preview" && validRows.length > 0 && (
            <Button onClick={handleConfirm}>
              {t("orders.import.confirm", { count: validRows.length })}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
