import * as React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { flexRender, type Row, type Cell } from "@tanstack/react-table";
import { MoreVertical, Pencil, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import EmployeeDialog from "./employee-dialog";
import ConfirmDeleteDialog from "./confirm-delete-dialog";
import { EmployeeDocumentsDialog } from "./employee-documents-dialog";
import { getCollection, updateItem, removeItem } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Employee, LeaveRequest } from "@/modules/hr/types";
import type { Trip } from "@/modules/transport/types";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface EmployeeRowProps {
  row: Row<Employee>;
  setData: React.Dispatch<React.SetStateAction<Employee[]>>;
}

export const EmployeeRow: React.FC<EmployeeRowProps> = ({ row, setData }) => {
  const { t } = useTranslation();
  const employee = row.original;
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [docsOpen, setDocsOpen] = React.useState(false);

  const handleDeleteClick = () => {
    const trips = getCollection<Trip>(STORAGE_KEYS.trips);
    const isOnActiveTrip = trips.some(
      (trip) =>
        trip.driverId === employee.id && trip.status === "in_desfasurare",
    );
    if (isOnActiveTrip) {
      toast.warning(t("employees.toast.deleteBlockedActiveTrip"));
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const leaveRequests = getCollection<LeaveRequest>(
      STORAGE_KEYS.leaveRequests,
    );
    const hasFutureLeave = leaveRequests.some(
      (l) =>
        l.employeeId === employee.id &&
        l.status === "approved" &&
        l.endDate >= today,
    );
    if (hasFutureLeave) {
      toast.warning(t("employees.toast.deleteBlockedFutureLeave"));
      return;
    }

    setDeleteOpen(true);
  };

  return (
    <TableRow key={row.id}>
      {row.getVisibleCells().map((cell: Cell<Employee, unknown>) =>
        cell.column.id === "actions" ? (
          <TableCell key={cell.id} className="text-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0"
                  aria-label={t("employees.actions.menu")}
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
                  {t("employees.actions.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setDocsOpen(true)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {t("employees.actions.documents")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  className="cursor-pointer"
                  onClick={handleDeleteClick}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("employees.actions.delete")}
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

      <EmployeeDialog
        mode="edit"
        employee={employee}
        open={editOpen}
        onOpenChange={setEditOpen}
        onEdit={(updated) => {
          updateItem<Employee>(
            STORAGE_KEYS.employees,
            (e) => e.id === updated.id,
            () => updated,
          );
          setData(getCollection<Employee>(STORAGE_KEYS.employees));
          toast.success(t("employees.toast.updated"));
        }}

      />
      <EmployeeDocumentsDialog
        employee={employee}
        open={docsOpen}
        onOpenChange={setDocsOpen}
        onUpdate={(updated) => setData((prev) => prev.map((e) => e.id === updated.id ? updated : e))}
      />
      <ConfirmDeleteDialog
        employeeName={employee.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDelete={() => {
          removeItem<Employee>(
            STORAGE_KEYS.employees,
            (e) => e.id === employee.id,
          );
          setData(getCollection<Employee>(STORAGE_KEYS.employees));
          toast.success(t("employees.toast.deleted"));
        }}
      />
    </TableRow>
  );
};
