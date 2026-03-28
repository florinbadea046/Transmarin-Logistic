import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
  type ColumnFiltersState,
  useReactTable,
} from "@tanstack/react-table";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { DataTablePagination } from "@/components/data-table/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import { getHRSettings } from "../utils/get-hr-settings";
import type { LeaveRequest, Employee } from "@/modules/hr/types";
import { formatDate } from "@/utils/format";
import LeaveDialog from "../components/leave-dialog";
import { LeaveTableRow } from "../components/leave-row";
import LeaveCalendar from "./_components/leave-calendar";

// ── Row type ─────────────────────────────────────────────────
type LeaveRow = LeaveRequest & { employeeName: string };

// ── Page ─────────────────────────────────────────────────────
export default function LeavesPage() {
  const { t } = useTranslation();
  const defaultLeaveDays = React.useMemo(() => getHRSettings().defaultLeaveDays, []);

  const LEAVE_TYPE_LABELS = React.useMemo<Record<LeaveRequest["type"], string>>(
    () => ({
      annual: t("leaves.types.annual"),
      sick: t("leaves.types.sick"),
      unpaid: t("leaves.types.unpaid"),
      other: t("leaves.types.other"),
    }),
    [t],
  );

  const STATUS_LABELS = React.useMemo<Record<LeaveRequest["status"], string>>(
    () => ({
      pending: t("leaves.status.pending"),
      approved: t("leaves.status.approved"),
      rejected: t("leaves.status.rejected"),
    }),
    [t],
  );

  const columns: ColumnDef<LeaveRow>[] = React.useMemo(
    () => [
      {
        accessorKey: "employeeName",
        enableHiding: false,
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("leaves.columns.employee")}
          />
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
          <DataTableColumnHeader
            column={column}
            title={t("leaves.columns.type")}
          />
        ),
        cell: ({ row }) => (
          <div className="whitespace-nowrap">
            {LEAVE_TYPE_LABELS[row.getValue("type") as LeaveRequest["type"]]}
          </div>
        ),
        filterFn: (row, id, value) => {
          if (!value || value === "all") return true;
          return row.getValue(id) === value;
        },
      },
      {
        id: "period",
        header: t("leaves.columns.period"),
        cell: ({ row }) => (
          <div className="whitespace-nowrap">
            {formatDate(row.original.startDate)} –{" "}
            {formatDate(row.original.endDate)}
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "days",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("leaves.columns.days")}
          />
        ),
        cell: ({ row }) => (
          <div className="whitespace-nowrap">
            {t("leaves.columns.daysValue", {
              count: row.getValue("days") as number,
            })}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("leaves.columns.status")}
          />
        ),
        cell: ({ row }) => {
          const status = row.getValue("status") as LeaveRequest["status"];
          const variant =
            status === "rejected" ? "destructive" : "secondary";
          const className =
            status === "approved"
              ? "bg-green-600 text-white hover:bg-green-600"
              : undefined;
          return (
            <Badge variant={variant} className={className}>
              {STATUS_LABELS[status]}
            </Badge>
          );
        },
        filterFn: (row, id, value) => {
          if (!value || value === "all") return true;
          return row.getValue(id) === value;
        },
      },
      {
        accessorKey: "reason",
        header: t("leaves.columns.reason"),
        cell: ({ row }) => (
          <div className="text-muted-foreground">
            {row.getValue("reason") || t("leaves.columns.noReason")}
          </div>
        ),
        enableSorting: false,
      },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        header: () => null,
        cell: () => null,
      },
    ],
    [LEAVE_TYPE_LABELS, STATUS_LABELS, t],
  );

  const employees = React.useMemo(
    () => getCollection<Employee>(STORAGE_KEYS.employees),
    [],
  );

  const employeeMap = React.useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach((e) => map.set(e.id, e.name));
    return map;
  }, [employees]);

  const toLeaveRow = React.useCallback(
    (lr: LeaveRequest): LeaveRow => ({
      ...lr,
      employeeName:
        employeeMap.get(lr.employeeId) ?? t("leaves.status.unknown"),
    }),
    [employeeMap, t],
  );

  const [data, setData] = React.useState<LeaveRow[]>(() =>
    getCollection<LeaveRequest>(STORAGE_KEYS.leaveRequests).map(toLeaveRow),
  );
  const [calendarKey, setCalendarKey] = React.useState(0);

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "employeeName", desc: false },
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter: search },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setSearch,
    globalFilterFn: (row, _columnId, value) => {
      const normalize = (s: string) =>
        s
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
      const q = normalize(String(value));
      if (!q) return true;
      return normalize(String(row.getValue("employeeName"))).includes(q);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 5, pageIndex: 0 } },
  });

  const handleTypeChange = (v: string) => {
    setTypeFilter(v);
    table.getColumn("type")?.setFilterValue(v === "all" ? undefined : v);
    table.setPageIndex(0);
  };

  const handleStatusChange = (v: string) => {
    setStatusFilter(v);
    table.getColumn("status")?.setFilterValue(v === "all" ? undefined : v);
    table.setPageIndex(0);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    table.setPageIndex(0);
  };

  const refreshData = React.useCallback(() => {
    setData(
      getCollection<LeaveRequest>(STORAGE_KEYS.leaveRequests).map(toLeaveRow),
    );
    setCalendarKey((k) => k + 1);
  }, [toLeaveRow]);

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("leaves.title")}</h1>
      </Header>
      <Main>
        <Tabs defaultValue="list">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="list">{t("leaves.tabs.list")}</TabsTrigger>
              <TabsTrigger value="calendar">
                {t("leaves.tabs.calendar")}
              </TabsTrigger>
            </TabsList>
            <LeaveDialog mode="add" onAdd={refreshData} />
          </div>

          <TabsContent value="list">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <CardTitle>{t("leaves.manage")}</CardTitle>
                    <Badge variant="secondary" className="text-xs font-normal">
                      {defaultLeaveDays} zile/an
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {t("leaves.requests", {
                      count: table.getFilteredRowModel().rows.length,
                    })}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Input
                    placeholder={t("leaves.searchPlaceholder")}
                    value={search}
                    onChange={handleSearch}
                    className="max-w-xs"
                  />
                  <Select value={typeFilter} onValueChange={handleTypeChange}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder={t("leaves.filters.type")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t("leaves.filters.allTypes")}
                      </SelectItem>
                      <SelectItem value="annual">
                        {t("leaves.types.annual")}
                      </SelectItem>
                      <SelectItem value="sick">
                        {t("leaves.types.sick")}
                      </SelectItem>
                      <SelectItem value="other">
                        {t("leaves.types.other")}
                      </SelectItem>
                      <SelectItem value="unpaid">
                        {t("leaves.types.unpaid")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={statusFilter}
                    onValueChange={handleStatusChange}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder={t("leaves.filters.status")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t("leaves.filters.allStatuses")}
                      </SelectItem>
                      <SelectItem value="pending">
                        {t("leaves.status.pending")}
                      </SelectItem>
                      <SelectItem value="approved">
                        {t("leaves.status.approved")}
                      </SelectItem>
                      <SelectItem value="rejected">
                        {t("leaves.status.rejected")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <TableHead key={header.id}>
                              {header.isPlaceholder
                                ? null
                                : flexRender(
                                    header.column.columnDef.header,
                                    header.getContext(),
                                  )}
                            </TableHead>
                          ))}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {table.getRowModel().rows.length ? (
                        table
                          .getRowModel()
                          .rows.map((row) => (
                            <LeaveTableRow
                              key={row.id}
                              row={row}
                              setData={setData}
                              employeeMap={employeeMap}
                              onRefreshCalendar={() =>
                                setCalendarKey((k) => k + 1)
                              }
                            />
                          ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={table.getVisibleLeafColumns().length}
                            className="h-24 text-center text-muted-foreground"
                          >
                            {t("leaves.noResults")}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <DataTablePagination table={table} pageSizes={[5, 10, 20]} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar">
            <LeaveCalendar key={calendarKey} />
          </TabsContent>
        </Tabs>
      </Main>
    </>
  );
}
