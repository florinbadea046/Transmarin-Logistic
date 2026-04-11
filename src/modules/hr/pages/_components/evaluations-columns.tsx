import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import type { Employee, PerformanceEvaluation } from "@/modules/hr/types";
import { getEmpName, ALL_STATUSES } from "./evaluations-types";
import { StarRating } from "./evaluations-star-rating";

// ── Columns ──────────────────────────────────────────────

export function getColumns(
  t: (key: string) => string,
  employees: Employee[],
): ColumnDef<PerformanceEvaluation>[] {
  return [
    {
      accessorKey: "employeeId",
      enableHiding: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("evaluations.columns.employee")} />
      ),
      cell: ({ row }) => (
        <div className="font-medium whitespace-nowrap">
          {getEmpName(employees, row.getValue("employeeId"))}
        </div>
      ),
      sortingFn: (a, b) => {
        const na = getEmpName(employees, a.getValue("employeeId"));
        const nb = getEmpName(employees, b.getValue("employeeId"));
        return na.localeCompare(nb);
      },
    },
    {
      accessorKey: "evaluatorId",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("evaluations.columns.evaluator")} />
      ),
      cell: ({ row }) => (
        <div className="whitespace-nowrap">
          {getEmpName(employees, row.getValue("evaluatorId"))}
        </div>
      ),
    },
    {
      accessorKey: "period",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("evaluations.columns.period")} />
      ),
      cell: ({ row }) => <div className="whitespace-nowrap">{row.getValue("period")}</div>,
    },
    {
      accessorKey: "averageScore",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("evaluations.columns.score")} />
      ),
      cell: ({ row }) => {
        const score = row.getValue("averageScore") as number;
        return (
          <div className="flex items-center gap-1.5">
            <StarRating value={Math.round(score)} readonly />
            <span className="text-sm text-muted-foreground">({score.toFixed(2)})</span>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("evaluations.columns.status")} />
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge variant={status === "final" ? "default" : "secondary"}>
            {t(`evaluations.status.${status}`)}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        if (!value || value === ALL_STATUSES) return true;
        return row.getValue(id) === value;
      },
    },
    {
      id: "actions",
      enableSorting: false,
      enableHiding: false,
      header: () => null,
      cell: () => null, // rendered in row
    },
  ];
}
