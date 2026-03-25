import * as React from "react";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { LeaveRequest, Employee } from "@/modules/hr/types";
import { formatDate } from "@/utils/format";
import LeaveDialog from "../components/leave-dialog";
import { LeaveTableRow } from "../components/leave-row";
import LeaveCalendar from "./_components/leave-calendar";

const UNKNOWN_EMPLOYEE = "Necunoscut";

// ── Labels ───────────────────────────────────────────────────
const LEAVE_TYPE_LABELS: Record<LeaveRequest["type"], string> = {
  annual: "Odihnă",
  sick: "Medical",
  unpaid: "Fără plată",
  other: "Personal",
};

const STATUS_LABELS: Record<LeaveRequest["status"], string> = {
  pending: "În așteptare",
  approved: "Aprobat",
  rejected: "Respins",
};

function StatusBadge({ status }: { status: LeaveRequest["status"] }) {
  const variant =
    status === "approved"
      ? "default"
      : status === "rejected"
        ? "destructive"
        : "secondary";
  return <Badge variant={variant}>{STATUS_LABELS[status]}</Badge>;
}

// ── Row type ─────────────────────────────────────────────────
type LeaveRow = LeaveRequest & { employeeName: string };

// ── Columns ──────────────────────────────────────────────────
const columns: ColumnDef<LeaveRow>[] = [
  {
    accessorKey: "employeeName",
    enableHiding: false,
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
      <DataTableColumnHeader column={column} title="Tip concediu" />
    ),
    cell: ({ row }) => (
      <div className="whitespace-nowrap">
        {LEAVE_TYPE_LABELS[row.getValue("type") as LeaveRequest["type"]]}
      </div>
    ),
    filterFn: (row, id, value) => {
      if (!value || value === "Toate") return true;
      return row.getValue(id) === value;
    },
  },
  {
    id: "period",
    header: "Perioadă",
    cell: ({ row }) => (
      <div className="whitespace-nowrap">
        {formatDate(row.original.startDate)} – {formatDate(row.original.endDate)}
      </div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "days",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Zile" />
    ),
    cell: ({ row }) => (
      <div className="whitespace-nowrap">{row.getValue("days")} zile</div>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    filterFn: (row, id, value) => {
      if (!value || value === "Toate") return true;
      return row.getValue(id) === value;
    },
  },
  {
    accessorKey: "reason",
    header: "Motiv",
    cell: ({ row }) => (
      <div className="text-muted-foreground">
        {row.getValue("reason") || "—"}
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
];

// ── Page ─────────────────────────────────────────────────────
export default function LeavesPage() {
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
      employeeName: employeeMap.get(lr.employeeId) ?? UNKNOWN_EMPLOYEE,
    }),
    [employeeMap],
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
  const [typeFilter, setTypeFilter] = React.useState("Toate");
  const [statusFilter, setStatusFilter] = React.useState("Toate");

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
    table.getColumn("type")?.setFilterValue(v === "Toate" ? undefined : v);
    table.setPageIndex(0);
  };

  const handleStatusChange = (v: string) => {
    setStatusFilter(v);
    table.getColumn("status")?.setFilterValue(v === "Toate" ? undefined : v);
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
        <h1 className="text-lg font-semibold">Concedii</h1>
      </Header>
      <Main>
        <Tabs defaultValue="list">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="list">Listă</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
            </TabsList>
            <LeaveDialog mode="add" onAdd={refreshData} />
          </div>

          <TabsContent value="list">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle>Gestiune Concedii</CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {table.getFilteredRowModel().rows.length} cereri
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Input
                    placeholder="Caută după angajat..."
                    value={search}
                    onChange={handleSearch}
                    className="max-w-xs"
                  />
                  <Select value={typeFilter} onValueChange={handleTypeChange}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Tip concediu" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Toate">Toate tipurile</SelectItem>
                      <SelectItem value="annual">Odihnă</SelectItem>
                      <SelectItem value="sick">Medical</SelectItem>
                      <SelectItem value="other">Personal</SelectItem>
                      <SelectItem value="unpaid">Fără plată</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Toate">Toate statusurile</SelectItem>
                      <SelectItem value="pending">În așteptare</SelectItem>
                      <SelectItem value="approved">Aprobat</SelectItem>
                      <SelectItem value="rejected">Respins</SelectItem>
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
                        table.getRowModel().rows.map((row) => (
                          <LeaveTableRow
                            key={row.id}
                            row={row}
                            setData={setData}
                            employeeMap={employeeMap}
                            onRefreshCalendar={() => setCalendarKey((k) => k + 1)}
                          />
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={table.getVisibleLeafColumns().length}
                            className="h-24 text-center text-muted-foreground"
                          >
                            Nicio cerere de concediu găsită.
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
