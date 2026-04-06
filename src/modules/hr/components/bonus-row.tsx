import * as React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { flexRender, type Row, type Cell } from "@tanstack/react-table";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import BonusDialog from "./bonus-dialog";
import { removeItem } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Employee, Bonus } from "@/modules/hr/types";
import { toast } from "sonner";
import { useHrAuditLog } from "@/hooks/use-hr-audit-log";
import { useTranslation } from "react-i18next";

export type BonusRow = Bonus & { employeeName: string };

interface Props {
  row: Row<BonusRow>;
  employees: Employee[];
  onRefresh: () => void;
}

export const BonusTableRow: React.FC<Props> = ({ row, employees, onRefresh }) => {
  const bonus = row.original;
  const { log } = useHrAuditLog();
  const { t } = useTranslation();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const handleDelete = () => {
    removeItem<Bonus>(STORAGE_KEYS.bonuses, (b) => b.id === bonus.id);
    log({
      action: "delete",
      entity: "bonus",
      entityId: bonus.id,
      entityLabel: bonus.employeeName,
      details: `${bonus.type}: ${bonus.amount} RON`,
    });
    onRefresh();
    toast.success(t("payroll.bonusRow.deleteSuccess"));
  };

  return (
    <TableRow>
      {row.getVisibleCells().map((cell: Cell<BonusRow, unknown>) =>
        cell.column.id === "actions" ? (
          <TableCell key={cell.id} className="text-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  {t("payroll.bonusRow.edit")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("payroll.bonusRow.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        ) : (
          <TableCell key={cell.id}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ),
      )}
      <BonusDialog
        mode="edit"
        bonus={bonus}
        employees={employees}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={onRefresh}
      />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("payroll.bonusRow.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("payroll.bonusRow.deleteDesc")}{" "}
              <strong>{bonus.employeeName}</strong>? {t("payroll.bonusRow.deleteDescSuffix")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("payroll.bonusRow.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TableRow>
  );
};