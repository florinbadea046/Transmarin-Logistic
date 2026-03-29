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
import BonusDialog from "./bonus-dialog";
import ConfirmDeleteDialog from "./confirm-delete-dialog";
import { removeItem } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Employee, Bonus } from "@/modules/hr/types";
import { toast } from "sonner";

export type BonusRow = Bonus & { employeeName: string };

interface Props {
  row: Row<BonusRow>;
  employees: Employee[];
  onRefresh: () => void;
}

export const BonusTableRow: React.FC<Props> = ({ row, employees, onRefresh }) => {
  const bonus = row.original;
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const handleDelete = () => {
    removeItem<Bonus>(STORAGE_KEYS.bonuses, (b) => b.id === bonus.id);
    onRefresh();
    toast.success("Înregistrare ștearsă");
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
                  Editează
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
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
      <BonusDialog
        mode="edit"
        bonus={bonus}
        employees={employees}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={onRefresh}
      />
      <ConfirmDeleteDialog
        employeeName={bonus.employeeName}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDelete={handleDelete}
      />
    </TableRow>
  );
};