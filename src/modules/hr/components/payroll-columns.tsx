import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { formatCurrency, formatDate } from "@/utils/format";
import type { Bonus } from "@/modules/hr/types";
import { BONUS_TYPE_LABELS, type PayrollRow } from "../payroll/payroll-shared";
import type { BonusRow } from "./bonus-row";

// ── Payroll table columns ────────────────────────────────────
export const payrollColumns: ColumnDef<PayrollRow>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Angajat" />
    ),
    cell: ({ row }) => (
      <div className="font-medium whitespace-nowrap">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "department",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Departament" />
    ),
    cell: ({ row }) => (
      <Badge variant="secondary">{row.getValue("department")}</Badge>
    ),
    filterFn: (row, id, value) => {
      if (!value || value === "Toate") return true;
      return row.getValue(id) === value;
    },
  },
  {
    accessorKey: "salary",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Salariu bază" />
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
      <DataTableColumnHeader column={column} title="Diurnă" />
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
      <DataTableColumnHeader column={column} title="Bonusuri" />
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
      <DataTableColumnHeader column={column} title="Amenzi" />
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
      <DataTableColumnHeader column={column} title="Ore supl." />
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
      <DataTableColumnHeader column={column} title="Total net" />
    ),
    cell: ({ row }) => (
      <div className="whitespace-nowrap font-semibold">
        {formatCurrency(row.getValue("totalNet"))}
      </div>
    ),
  },
];

// ── Bonus table columns ──────────────────────────────────────
export const bonusColumns: ColumnDef<BonusRow>[] = [
  {
    accessorKey: "employeeName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Angajat" />
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
      <DataTableColumnHeader column={column} title="Tip" />
    ),
    cell: ({ row }) => {
      const t = row.getValue("type") as Bonus["type"];
      return <Badge variant="outline">{BONUS_TYPE_LABELS[t]}</Badge>;
    },
    filterFn: (row, id, value) => {
      if (!value || value === "Toate") return true;
      return row.getValue(id) === value;
    },
  },
  {
    accessorKey: "amount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Sumă" />
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
      <DataTableColumnHeader column={column} title="Dată" />
    ),
    cell: ({ row }) => (
      <div className="whitespace-nowrap">{formatDate(row.getValue("date"))}</div>
    ),
  },
  {
    accessorKey: "description",
    header: "Descriere",
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
