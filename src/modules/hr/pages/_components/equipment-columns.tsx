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
      cell: ({ row }) => (
        <div className="whitespace-nowrap">
          {empName(row.getValue("employeeId"))}
        </div>
      ),
      sortingFn: (a, b) =>
        empName(a.getValue("employeeId")).localeCompare(
          empName(b.getValue("employeeId")),
        ),
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
        />
      ),
      cell: ({ row }) => (
        <div className="whitespace-nowrap text-right tabular-nums">
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
        const d = row.original.returnedDate;
        if (!d) {
          return (
            <Badge variant="default" className="whitespace-nowrap">
              {t("equipment.assigned")}
            </Badge>
          );
        }
        const today = new Date().toISOString().slice(0, 10);
        if (d > today) {
          return (
            <Badge variant="outline" className="whitespace-nowrap">
              {t("equipment.scheduledReturn")} — {formatDate(d)}
            </Badge>
          );
        }
        return (
          <Badge variant="secondary" className="whitespace-nowrap">
            {t("equipment.returned")} — {formatDate(d)}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      enableSorting: false,
      enableHiding: false,
      header: () => null,
      cell: () => null,
    },
  ];
}
