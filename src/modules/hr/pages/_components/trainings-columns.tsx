import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import type { Training, TrainingStatus } from "@/modules/hr/types";
import { formatDate } from "@/utils/format";

export const ALL_STATUSES = "__all__";
export const ALL_TYPES = "__all__";

const STATUS_VARIANT: Record<
  TrainingStatus,
  "default" | "secondary" | "outline"
> = {
  finalizat: "default",
  in_curs: "secondary",
  planificat: "outline",
};

export function getTrainingColumns(
  t: (key: string) => string,
): ColumnDef<Training>[] {
  return [
    {
      accessorKey: "title",
      enableHiding: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("trainings.columns.title")} />
      ),
      cell: ({ row }) => (
        <div className="font-medium whitespace-nowrap">
          {row.getValue("title")}
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("trainings.columns.type")} />
      ),
      cell: ({ row }) => {
        const type = row.getValue("type") as string;
        return (
          <Badge variant={type === "intern" ? "secondary" : "outline"}>
            {t(`trainings.type.${type}`)}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        if (!value || value === ALL_TYPES) return true;
        return row.getValue(id) === value;
      },
    },
    {
      accessorKey: "date",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("trainings.columns.date")} />
      ),
      cell: ({ row }) => (
        <div className="whitespace-nowrap">
          {formatDate(row.getValue("date"))}
        </div>
      ),
    },
    {
      accessorKey: "durationHours",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("trainings.columns.duration")} />
      ),
      cell: ({ row }) => (
        <div className="whitespace-nowrap">
          {row.getValue("durationHours")} {t("trainings.hoursShort")}
        </div>
      ),
    },
    {
      accessorKey: "trainer",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("trainings.columns.trainer")} />
      ),
      cell: ({ row }) => (
        <div className="whitespace-nowrap">{row.getValue("trainer")}</div>
      ),
    },
    {
      id: "participants",
      header: t("trainings.columns.participants"),
      cell: ({ row }) => {
        const ids = row.original.participantIds ?? [];
        return (
          <Badge variant="outline" className="whitespace-nowrap">
            {ids.length}
          </Badge>
        );
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("trainings.columns.status")} />
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as TrainingStatus;
        return (
          <Badge variant={STATUS_VARIANT[status]}>
            {t(`trainings.status.${status}`)}
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
      cell: () => null, // rendered inline in page
    },
  ];
}
