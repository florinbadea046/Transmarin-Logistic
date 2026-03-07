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
import EmployeeDialog from "./employee-dialog";
import ConfirmDeleteDialog from "./confirm-delete-dialog";
import { getCollection, updateItem, removeItem } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Employee } from "@/modules/hr/types";
import { toast } from "sonner";

interface EmployeeRowProps {
  row: Row<Employee>;
  setData: React.Dispatch<React.SetStateAction<Employee[]>>;
  hasActiveLeave: boolean;
}

export const EmployeeRow: React.FC<EmployeeRowProps> = ({ row, setData, hasActiveLeave }) => {
  const employee = row.original;
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  return (
    <TableRow key={row.id}>
      {row.getVisibleCells().map((cell: Cell<Employee, unknown>) =>
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
                  Editează
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  disabled={hasActiveLeave}
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Șterge
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
          toast.success("Angajat actualizat cu succes");
        }}
      />
      <ConfirmDeleteDialog
        disabled={hasActiveLeave}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDelete={() => {
          removeItem<Employee>(
            STORAGE_KEYS.employees,
            (e) => e.id === employee.id,
          );
          setData(getCollection<Employee>(STORAGE_KEYS.employees));
          toast.success("Angajat șters cu succes");
        }}
      />
    </TableRow>
  );
};
