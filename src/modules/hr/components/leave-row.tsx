import * as React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { flexRender, type Row, type Cell } from "@tanstack/react-table";
import { MoreVertical, Pencil, Trash2, Check, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
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
import LeaveDialog from "./leave-dialog";
import { getCollection, removeItem, updateItem } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { LeaveRequest } from "@/modules/hr/types";
import { toast } from "sonner";
import { useHrAuditLog } from "@/hooks/use-hr-audit-log";
import { useTranslation } from "react-i18next";


type LeaveRow = LeaveRequest & { employeeName: string };

interface LeaveRowProps {
  row: Row<LeaveRow>;
  setData: React.Dispatch<React.SetStateAction<LeaveRow[]>>;
  employeeMap: Map<string, string>;
  /** Apelat după edit/delete pentru a sincroniza view-ul calendar. */
  onRefreshCalendar?: () => void;
}

export const LeaveTableRow: React.FC<LeaveRowProps> = ({
  row,
  setData,
  employeeMap,
  onRefreshCalendar,
}) => {
  const leave = row.original;
  const { log } = useHrAuditLog();
  const { t } = useTranslation();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [statusChanging, setStatusChanging] = React.useState(false);

  const refreshData = React.useCallback(() => {
    const updated = getCollection<LeaveRequest>(
      STORAGE_KEYS.leaveRequests,
    ).map((lr) => ({
      ...lr,
      employeeName: employeeMap.get(lr.employeeId) ?? t("leaves.unknown"),
    }));
    setData(updated);
    onRefreshCalendar?.();
  }, [employeeMap, setData, onRefreshCalendar, t]);

  const handleStatusChange = (newStatus: "approved" | "rejected") => {
    if (statusChanging) return;
    setStatusChanging(true);
    updateItem<LeaveRequest>(
      STORAGE_KEYS.leaveRequests,
      (lr) => lr.id === leave.id,
      (lr) => ({ ...lr, status: newStatus }),
    );
    log({
      action: newStatus === "approved" ? "approve" : "reject",
      entity: "leave",
      entityId: leave.id,
      entityLabel: leave.employeeName,
      details: `${leave.type}, ${leave.startDate} – ${leave.endDate}`,
    });
    refreshData();
    setStatusChanging(false);
    toast.success(
      newStatus === "approved"
        ? t("leaves.toast.approved", { name: leave.employeeName })
        : t("leaves.toast.rejected", { name: leave.employeeName }),
    );
  };

  return (
    <TableRow key={row.id}>
      {row.getVisibleCells().map((cell: Cell<LeaveRow, unknown>) =>
        cell.column.id === "actions" ? (
          <TableCell key={cell.id} className="text-right">
            <div className="flex items-center justify-end gap-1">
              {leave.status === "pending" && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                    aria-label={t("leaves.actions.approve")}
                    disabled={statusChanging}
                    onClick={() => handleStatusChange("approved")}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                    aria-label={t("leaves.actions.reject")}
                    disabled={statusChanging}
                    onClick={() => handleStatusChange("rejected")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0"
                  aria-label={t("leaves.actions.actions")}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  {t("leaves.actions.edit")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  className="cursor-pointer"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("leaves.actions.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          </TableCell>
        ) : (
          <TableCell key={cell.id}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ),
      )}

      <LeaveDialog
        mode="edit"
        leave={leave}
        open={editOpen}
        onOpenChange={setEditOpen}
        onEdit={(updated) => {
          updateItem<LeaveRequest>(
            STORAGE_KEYS.leaveRequests,
            (lr) => lr.id === updated.id,
            () => updated,
          );
          log({
            action: "update",
            entity: "leave",
            entityId: updated.id,
            entityLabel: updated.employeeName ?? leave.employeeName,
            details: `${updated.type}, ${updated.startDate} – ${updated.endDate}`,
            oldValue: { type: leave.type, startDate: leave.startDate, endDate: leave.endDate, status: leave.status },
            newValue: { type: updated.type, startDate: updated.startDate, endDate: updated.endDate, status: updated.status },
          });
          refreshData();
          toast.success(t("leaves.calendar.updateSuccess"));
        }}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("leaves.calendar.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("leaves.calendar.confirmDeleteDesc")}{" "}
              <strong className="text-foreground">{leave.employeeName}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("leaves.calendar.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={() => {
                removeItem<LeaveRequest>(
                  STORAGE_KEYS.leaveRequests,
                  (lr) => lr.id === leave.id,
                );
                log({
                  action: "delete",
                  entity: "leave",
                  entityId: leave.id,
                  entityLabel: leave.employeeName,
                  details: `${leave.type}, ${leave.startDate} – ${leave.endDate}`,
                });
                refreshData();
                toast.success(t("leaves.calendar.deleteSuccess"));
              }}
            >
              {t("leaves.calendar.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TableRow>
  );
};
