import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export default function ConfirmDeleteDialog({
  disabled,
  onDelete,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: {
  disabled: boolean;
  onDelete: () => void;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange ?? setInternalOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmă ștergerea</DialogTitle>
        </DialogHeader>
        {disabled ? (
          <Alert variant="destructive">
            Angajatul are concedii active și nu poate fi șters.
          </Alert>
        ) : (
          <>
            <p>Ești sigur că vrei să ștergi acest angajat?</p>
            <div className="flex gap-2 justify-end pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" size="sm">
                  Anulează
                </Button>
              </DialogClose>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  onDelete();
                  setOpen(false);
                }}
              >
                Șterge
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
