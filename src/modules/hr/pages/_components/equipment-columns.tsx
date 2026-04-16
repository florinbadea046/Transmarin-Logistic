import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import type {
  Equipment,
  EquipmentCondition,
  Employee,
} from "@/modules/hr/types";
import { formatDate, formatCurrency } from "@/utils/format";

export const ALL_TYPES = "__all__";
export const ALL_CONDITIONS = "__all__";

const CONDITION_VARIANT: Record<
  EquipmentCondition,
  "default" | "secondary" | "outline" | "destructive"
> = {
  new: "default",
  good: "secondary",
  worn: "outline",
  broken: "destructive",
};

export function getEquipmentColumns(
  t: (key: string) => string,
  employees: Employee[],
): ColumnDef<Equipment>[] {
  const empName = (id: string) =>
    employees.find((e) => e.id === id)?.name ?? id;

  return [
    {
      accessorKey: "type",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("equipment.columns.type")}
        />
      ),
      cell: ({ row }) => (
        <Badge variant="outline" className="whitespace-nowrap">
          {t(`equipment.type.${row.getValue("type")}`)}
        </Badge>
      ),
      filterFn: (row, id, value) => {
        if (!value || value === ALL_TYPES) return true;
        return row.getValue(id) === value;
      },
    },
    {
      accessorKey: "inventoryNumber",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("equipment.columns.inventoryNumber")}
        />
      ),
      cell: ({ row }) => (
        <div className="font-mono text-xs whitespace-nowrap">
          {row.getValue("inventoryNumber")}
        </div>
      ),
    },
    {
      accessorKey: "employeeId",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("equipment.columns.employee")}
        />
      ),
      cell: ({ row }) => {
        // Folosește employeeName dacă există, altfel empName sau id
        const original = row.original;
        return (
          <div className="whitespace-nowrap">
            {original.employeeName || empName(row.getValue("employeeId"))}
          </div>
        );
      },
      sortingFn: (a, b) => {
        const aName = a.original.employeeName || empName(a.getValue("employeeId"));
        const bName = b.original.employeeName || empName(b.getValue("employeeId"));
        return aName.localeCompare(bName);
      },
    },
    {
      accessorKey: "assignedDate",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("equipment.columns.assignedDate")}
        />
      ),
      cell: ({ row }) => (
        <div className="whitespace-nowrap">
          {formatDate(row.getValue("assignedDate"))}
        </div>
      ),
    },
    {
      accessorKey: "condition",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("equipment.columns.condition")}
        />
      ),
      cell: ({ row }) => {
        const c = row.getValue("condition") as EquipmentCondition;
        return (
          <Badge variant={CONDITION_VARIANT[c]}>
            {t(`equipment.condition.${c}`)}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        if (!value || value === ALL_CONDITIONS) return true;
        return row.getValue(id) === value;
      },
    },
    {
      accessorKey: "value",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("equipment.columns.value")}
          className="text-right pr-6 min-w-[120px]"
        />
      ),
      cell: ({ row }) => (
        <div className="whitespace-nowrap text-right tabular-nums pr-6 min-w-[120px]">
          {formatCurrency(Number(row.getValue("value")))}
        </div>
      ),
    },
    {
      accessorKey: "returnedDate",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("equipment.columns.status")}
        />
      ),
      cell: ({ row }) => {
        // Folosește noile câmpuri dueDate și returnedAt, cu fallback pe cele vechi pentru compatibilitate
        const dueDate = row.original.dueDate || row.original.returnedDate;
        const returnedAt =
          row.original.returnedAt || row.original.returnedConfirmed;
        const employeeId = row.original.employeeId;
        const today = new Date().toISOString().slice(0, 10);
        if (returnedAt) {
          return (
            <Badge variant="secondary" className="whitespace-nowrap">
              {t("equipment.returned")} — {formatDate(returnedAt)}
            </Badge>
          );
        }
        if (dueDate) {
          if (dueDate > today) {
            return (
              <Badge variant="outline" className="whitespace-nowrap">
                {t("equipment.scheduledReturn")} — {formatDate(dueDate)}
              </Badge>
            );
          } else if (dueDate <= today) {
            // Dacă angajatul există, afișează 'Întârziat' în loc de 'overdue'
            return (
              <Badge variant="destructive" className="whitespace-nowrap">
                {t("equipment.late")} — {formatDate(dueDate)}
              </Badge>
            );
          }
        }
        return (
          <Badge variant="default" className="whitespace-nowrap">
            {t("equipment.assigned")}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      enableSorting: false,
      enableHiding: false,
      header: () => <div className="pl-6 min-w-[160px]" />,
      cell: () => <div className="pl-6 min-w-[160px]" />,
    },
  ];
}
