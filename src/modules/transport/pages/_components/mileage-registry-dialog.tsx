import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { RowData } from "./mileage-registry-utils";

interface MileageEditDialogProps {
  editRow: RowData | null;
  selectedMonth: string;
  formKmStart: string;
  formKmEnd: string;
  formErrors: Record<string, string>;
  onFormKmStartChange: (value: string) => void;
  onFormKmEndChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export function MileageEditDialog({
  editRow,
  selectedMonth,
  formKmStart,
  formKmEnd,
  formErrors,
  onFormKmStartChange,
  onFormKmEndChange,
  onSave,
  onClose,
}: MileageEditDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={!!editRow} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[95vw] max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("mileageRegistry.dialog.title")} — {editRow?.truck.plateNumber}
          </DialogTitle>
          <DialogDescription>
            {t("mileageRegistry.dialog.month")}: {selectedMonth}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="mr-kmStart">
              {t("mileageRegistry.fields.kmStart")}
            </Label>
            <Input
              id="mr-kmStart"
              type="number"
              min={0}
              value={formKmStart}
              onChange={(e) => onFormKmStartChange(e.target.value)}
            />
            {formErrors.kmStart && (
              <p className="text-xs text-destructive">{formErrors.kmStart}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="mr-kmEnd">
              {t("mileageRegistry.fields.kmEnd")}
            </Label>
            <Input
              id="mr-kmEnd"
              type="number"
              min={0}
              value={formKmEnd}
              onChange={(e) => onFormKmEndChange(e.target.value)}
            />
            {formErrors.kmEnd && (
              <p className="text-xs text-destructive">{formErrors.kmEnd}</p>
            )}
          </div>

          {formKmStart &&
            formKmEnd &&
            Number(formKmEnd) >= Number(formKmStart) && (
              <Alert>
                <AlertDescription className="text-xs">
                  {t("mileageRegistry.dialog.preview", {
                    km: (
                      Number(formKmEnd) - Number(formKmStart)
                    ).toLocaleString(),
                  })}
                </AlertDescription>
              </Alert>
            )}
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose}>
            {t("mileageRegistry.cancel")}
          </Button>
          <Button onClick={onSave}>{t("mileageRegistry.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
