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
import { buttonVariants } from "@/components/ui/button";
import LeaveDialog from "./leave-dialog";
import { getCollection, removeItem, updateItem } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { LeaveRequest } from "@/modules/hr/types";
import { toast } from "sonner";

type LeaveRow = LeaveRequest & { employeeName: string };

interface LeaveRowProps {
  row: Row<LeaveRow>;
  setData: React.Dispatch<React.SetStateAction<LeaveRow[]>>;
  employeeMap: Map<string, string>;
}

export const LeaveTableRow: React.FC<LeaveRowProps> = ({
  row,
  setData,
  employeeMap,
}) => {
  const leave = row.original;
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const refreshData = () => {
    const updated = getCollection<LeaveRequest>(
      STORAGE_KEYS.leaveRequests,
    ).map((lr) => ({
      ...lr,
      employeeName: employeeMap.get(lr.employeeId) ?? lr.employeeId,
    }));
    setData(updated);
  };

  return (
    <TableRow key={row.id}>
      {row.getVisibleCells().map((cell: Cell<LeaveRow, unknown>) =>
        cell.column.id === "actions" ? (
          <TableCell key={cell.id} className="text-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0"
                  aria-label="Acțiuni concediu"
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
                  Editează
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  className="cursor-pointer"
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
          refreshData();
          toast.success("Concediu actualizat cu succes");
        }}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmă ștergerea</AlertDialogTitle>
            <AlertDialogDescription>
              Sigur doriți să ștergeți concediul lui{" "}
              <strong className="text-foreground">{leave.employeeName}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={() => {
                removeItem<LeaveRequest>(
                  STORAGE_KEYS.leaveRequests,
                  (lr) => lr.id === leave.id,
                );
                refreshData();
                toast.success("Concediu șters cu succes");
              }}
            >
              Șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TableRow>
  );
};
