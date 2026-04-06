import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { formatCurrency, formatDate } from "@/utils/format";
import type { Bonus } from "@/modules/hr/types";
import type { PayrollRow } from "../payroll/payroll-shared";
import type { BonusRow } from "./bonus-row";

type TFunction = (key: string) => string;

// ── Payroll table columns ────────────────────────────────────
export function createPayrollColumns(t: TFunction): ColumnDef<PayrollRow>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("payroll.columns.employee")} />
      ),
      cell: ({ row }) => (
        <div className="font-medium whitespace-nowrap">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "department",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("payroll.columns.department")} />
      ),
      cell: ({ row }) => (
        <Badge variant="secondary">{row.getValue("department")}</Badge>
      ),
      filterFn: (row, id, value) => {
        if (!value) return true;
        return row.getValue(id) === value;
      },
    },
    {
      accessorKey: "salary",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("payroll.columns.baseSalary")} />
      ),
      cell: ({ row }) => (
        <div className="whitespace-nowrap">
          {formatCurrency(row.getValue("salary"))}
        </div>
      ),
    },
    {
      accessorKey: "diurna",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("payroll.columns.diurna")} />
      ),
      cell: ({ row }) => {
        const v = row.getValue("diurna") as number;
        return (
          <div className="whitespace-nowrap">
            {v > 0 ? formatCurrency(v) : "—"}
          </div>
        );
      },
    },
    {
      accessorKey: "bonusuri",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("payroll.columns.bonuses")} />
      ),
      cell: ({ row }) => {
        const v = row.getValue("bonusuri") as number;
        return v > 0 ? (
          <div className="whitespace-nowrap text-green-600">{formatCurrency(v)}</div>
        ) : (
          <div className="whitespace-nowrap">—</div>
        );
      },
    },
    {
      accessorKey: "amenzi",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("payroll.columns.fines")} />
      ),
      cell: ({ row }) => {
        const v = row.getValue("amenzi") as number;
        return v > 0 ? (
          <div className="whitespace-nowrap text-red-600">-{formatCurrency(v)}</div>
        ) : (
          <div className="whitespace-nowrap">—</div>
        );
      },
    },
    {
      accessorKey: "oreSuplimentare",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("payroll.columns.overtime")} />
      ),
      cell: ({ row }) => {
        const v = row.getValue("oreSuplimentare") as number;
        return (
          <div className="whitespace-nowrap">
            {v > 0 ? formatCurrency(v) : "—"}
          </div>
        );
      },
    },
    {
      accessorKey: "totalNet",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("payroll.columns.totalNet")} />
      ),
      cell: ({ row }) => (
        <div className="whitespace-nowrap font-semibold">
          {formatCurrency(row.getValue("totalNet"))}
        </div>
      ),
    },
  ];
}

// ── Bonus table columns ──────────────────────────────────────
export function createBonusColumns(t: TFunction): ColumnDef<BonusRow>[] {
  return [
    {
      accessorKey: "employeeName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("payroll.columns.employee")} />
      ),
      cell: ({ row }) => (
        <div className="font-medium whitespace-nowrap">
          {row.getValue("employeeName")}
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("payroll.columns.type")} />
      ),
      cell: ({ row }) => {
        const type = row.getValue("type") as Bonus["type"];
        return <Badge variant="outline">{t(`payroll.types.${type}`)}</Badge>;
      },
      filterFn: (row, id, value) => {
        if (!value) return true;
        return row.getValue(id) === value;
      },
    },
    {
      accessorKey: "amount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("payroll.columns.amount")} />
      ),
      cell: ({ row }) => {
        const v = row.getValue("amount") as number;
        const isPenalty = row.original.type === "amenda";
        const isNegative = v < 0 || isPenalty;
        const absoluteValue = Math.abs(v);
        return (
          <div
            className={`whitespace-nowrap font-medium ${isNegative ? "text-red-600" : "text-green-600"}`}
          >
            {isNegative ? `-${formatCurrency(absoluteValue)}` : formatCurrency(absoluteValue)}
          </div>
        );
      },
    },
    {
      accessorKey: "date",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("payroll.columns.date")} />
      ),
      cell: ({ row }) => (
        <div className="whitespace-nowrap">{formatDate(row.getValue("date"))}</div>
      ),
    },
    {
      accessorKey: "description",
      header: t("payroll.columns.description"),
      enableSorting: false,
      cell: ({ row }) => (
        <div className="max-w-xs truncate">{row.getValue("description")}</div>
      ),
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
