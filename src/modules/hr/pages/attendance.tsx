import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { FileDown } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { getCollection, setCollection } from "@/utils/local-storage";
import { STORAGE_KEYS, EMPLOYEE_DEPARTMENTS } from "@/data/mock-data";
import { useHrAuditLog } from "@/hooks/use-hr-audit-log";
import type {
  Employee,
  LeaveRequest,
  AttendanceRecord,
  AttendanceStatus,
} from "@/modules/hr/types";
import { getMonthOptions, currentMonth } from "../payroll/payroll-shared";
import {
  COLUMN_VISIBILITY,
  WEEKEND_BLOCKED,
  STATUS_CYCLE,
  STATUS_CONFIG,
  ALL_DEPARTMENTS,
  exportAttendancePDF,
  type AttendanceRow,
} from "./attendance-shared";

// ── Page ─────────────────────────────────────────────────
export default function AttendancePage() {
  const { t, i18n } = useTranslation();
  const { log } = useHrAuditLog();

  const monthOptions = React.useMemo(
    () => getMonthOptions(i18n.language.startsWith("en") ? "en-GB" : "ro-RO"),
    [i18n.language],
  );

  const STATUS_NAMES: Record<AttendanceStatus, string> = React.useMemo(() => ({
    P: t("attendance.status.present"),
    CO: t("attendance.status.annualLeave"),
    CM: t("attendance.status.sickLeave"),
    A: t("attendance.status.absent"),
    LP: t("attendance.status.paidLeave"),
  }), [t]);
  const logRef = React.useRef(log);
  logRef.current = log;

  const [selectedMonth, setSelectedMonth] = React.useState(currentMonth);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );

  const deptFilter =
    (columnFilters.find((f) => f.id === "department")?.value as string) ??
    ALL_DEPARTMENTS;

  const employees = React.useMemo(
    () =>
      getCollection<Employee>(STORAGE_KEYS.employees).sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    [],
  );

  const leaveRecords = React.useMemo(
    () =>
      getCollection<LeaveRequest>(STORAGE_KEYS.leaveRequests).filter(
        (l) => l.status === "approved",
      ),
    [],
  );

  const [records, setRecords] = React.useState<AttendanceRecord[]>(() => {
    try {
      return getCollection<AttendanceRecord>(STORAGE_KEYS.attendance);
    } catch {
      return [];
    }
  });

  const attendanceMap = React.useMemo(
    () => new Map(records.map((r) => [`${r.employeeId}_${r.date}`, r.status])),
    [records],
  );

  const days = React.useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dow = new Date(year, month - 1, day).getDay();
      return { day, date, isWeekend: dow === 0 || dow === 6 };
    });
  }, [selectedMonth]);

  const weekendMap = React.useMemo(
    () => new Map(days.map(({ date, isWeekend }) => [date, isWeekend])),
    [days],
  );

  const leaveMap = React.useMemo(() => {
    const map = new Map<
      string,
      { startDate: string; endDate: string; autoStatus: AttendanceStatus }[]
    >();
    leaveRecords.forEach((l) => {
      const autoStatus: AttendanceStatus | undefined =
        l.type === "annual" ? "CO" : l.type === "sick" ? "CM" : undefined;
      if (!autoStatus) return;
      if (!map.has(l.employeeId)) map.set(l.employeeId, []);
      map
        .get(l.employeeId)!
        .push({ startDate: l.startDate, endDate: l.endDate, autoStatus });
    });
    return map;
  }, [leaveRecords]);

  const tableData = React.useMemo<AttendanceRow[]>(
    () =>
      employees.map((emp) => {
        const empLeaves = leaveMap.get(emp.id) ?? [];
        return {
          employee: emp,
          days: Object.fromEntries(
            days.map(({ date, isWeekend }) => {
              const stored = attendanceMap.get(`${emp.id}_${date}`);
              if (stored !== undefined) return [date, stored];
              if (isWeekend) {
                const leave = empLeaves.find(
                  (l) =>
                    l.startDate <= date &&
                    l.endDate >= date &&
                    !WEEKEND_BLOCKED.has(l.autoStatus),
                );
                return [date, leave?.autoStatus];
              }
              const leave = empLeaves.find(
                (l) => l.startDate <= date && l.endDate >= date,
              );
              return [date, leave?.autoStatus];
            }),
          ),
        };
      }),
    [employees, days, attendanceMap, leaveMap],
  );

  // #3 — refs pentru records și attendanceMap astfel încât handleCellClick
  //       să fie stabil ([] deps) și să nu cauzeze rebuild cascade al columns
  const recordsRef = React.useRef(records);
  recordsRef.current = records;
  const attendanceMapRef = React.useRef(attendanceMap);
  attendanceMapRef.current = attendanceMap;
  const employeesRef = React.useRef(employees);
  employeesRef.current = employees;

  const handleCellClick = React.useCallback(
    (
      employeeId: string,
      date: string,
      currentStatus: AttendanceStatus | undefined,
      isWeekend?: boolean,
    ) => {
      const records = recordsRef.current;
      const attendanceMap = attendanceMapRef.current;

      const allowedCycle = isWeekend
        ? STATUS_CYCLE.filter((s) => s === undefined || !WEEKEND_BLOCKED.has(s))
        : STATUS_CYCLE;
      // indexOf returnează -1 pentru status invalid; (−1+1)%length=0 → resetează la undefined
      const currentIdx = allowedCycle.indexOf(currentStatus);
      const next = allowedCycle[(currentIdx + 1) % allowedCycle.length];

      const key = `${employeeId}_${date}`;
      const hasExisting = attendanceMap.has(key);
      let newRecords: AttendanceRecord[];

      const isAutoPopulated = !hasExisting && currentStatus !== undefined;

      if (next === undefined && !isAutoPopulated) {
        newRecords = records.filter(
          (r) => !(r.employeeId === employeeId && r.date === date),
        );
      } else if (next === undefined && isAutoPopulated) {
        // #5 — "P" e assignabil direct fără cast
        newRecords = [
          ...records,
          { id: key, employeeId, date, status: "P" },
        ];
      } else if (next !== undefined && hasExisting) {
        newRecords = records.map((r) =>
          r.employeeId === employeeId && r.date === date
            ? { ...r, status: next }
            : r,
        );
      } else {
        newRecords = [
          ...records,
          { id: key, employeeId, date, status: next! },
        ];
      }

      setRecords(newRecords);
      setCollection(STORAGE_KEYS.attendance, newRecords);

      const empName = employeesRef.current.find((e) => e.id === employeeId)?.name ?? employeeId;
      const auditAction =
        next === undefined ? "delete" :
        !hasExisting && currentStatus === undefined ? "create" :
        "update";
      logRef.current({
        action: auditAction,
        entity: "attendance",
        entityId: `${employeeId}_${date}`,
        entityLabel: empName,
        details: `${date}: ${currentStatus ?? "—"} → ${next ?? "—"}`,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const columns = React.useMemo<ColumnDef<AttendanceRow>[]>(
    () => [
      {
        id: "name",
        accessorFn: (row) => row.employee.name,
        header: t("attendance.columns.employee"),
        enableHiding: false,
        cell: ({ getValue }) => (
          <div className="font-medium whitespace-nowrap">
            {getValue() as string}
          </div>
        ),
      },
      {
        id: "department",
        accessorFn: (row) => row.employee.department,
        filterFn: (row, _id, value) => {
          if (!value || value === ALL_DEPARTMENTS) return true;
          return row.original.employee.department === value;
        },
      },
      ...days.map(
        ({ day, date, isWeekend }): ColumnDef<AttendanceRow> => ({
          id: date,
          enableSorting: false,
          header: () => (
            <span className={isWeekend ? "text-muted-foreground" : ""}>
              {day}
            </span>
          ),
          cell: ({ row }) => {
            const status = row.original.days[date];
            const cfg = status ? STATUS_CONFIG[status] : undefined;
            // #6 + #7 — aria-label pentru accesibilitate; aria-hidden pe "·" invizibil
            return (
              <button
                onClick={() =>
                  handleCellClick(row.original.employee.id, date, status, isWeekend)
                }
                aria-label={cfg ? STATUS_NAMES[status!] : t("attendance.status.setStatus")}
                className={`inline-flex h-6 w-7 items-center justify-center rounded text-xs font-semibold transition-colors cursor-pointer ${cfg ? cfg.cellClass : isWeekend ? "hover:bg-muted/60 text-transparent" : "hover:bg-muted text-transparent"}`}
                title={cfg ? STATUS_NAMES[status!] : t("attendance.status.clickToSet")}
              >
                <span aria-hidden="true">{cfg ? cfg.label : "·"}</span>
              </button>
            );
          },
        }),
      ),
    ],
    [days, handleCellClick, t, STATUS_NAMES],
  );

  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      columnFilters,
      columnVisibility: COLUMN_VISIBILITY,
    },
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const handleDeptChange = (value: string) => {
    table
      .getColumn("department")
      ?.setFilterValue(value === ALL_DEPARTMENTS ? undefined : value);
  };

  const monthLabel =
    monthOptions.find((o) => o.value === selectedMonth)?.label ??
    selectedMonth;

  const visibleRows = table.getFilteredRowModel().rows;

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("attendance.title")}</h1>
      </Header>
      <Main>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle>{t("attendance.manage")}</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="flex-1 min-w-[140px] sm:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={deptFilter} onValueChange={handleDeptChange}>
                  <SelectTrigger className="flex-1 min-w-[140px] sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_DEPARTMENTS}>{t("attendance.allDepartments")}</SelectItem>
                    {EMPLOYEE_DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {t(`departments.${d}`, { defaultValue: d })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* #2 — buton dezactivat dacă nu există angajați vizibili */}
                <Button
                  variant="outline"
                  disabled={visibleRows.length === 0}
                  onClick={() =>
                    exportAttendancePDF(
                      visibleRows.map((r) => r.original),
                      days,
                      monthLabel,
                      t,
                      i18n.language.startsWith("en") ? "en-GB" : "ro-RO",
                    )
                  }
                >
                  <FileDown className="h-4 w-4 mr-1.5" />
                  {t("attendance.exportPdf")}
                </Button>
              </div>
            </div>

            {/* Legenda */}
            <div className="flex flex-wrap gap-3 mt-2">
              {(
                Object.entries(STATUS_CONFIG) as [
                  AttendanceStatus,
                  (typeof STATUS_CONFIG)[AttendanceStatus],
                ][]
              ).map(([status, cfg]) => (
                <div key={status} className="flex items-center gap-1 text-xs">
                  <span
                    className={`inline-flex h-5 w-7 items-center justify-center rounded text-xs font-semibold ${cfg.cellClass}`}
                  >
                    {cfg.label}
                  </span>
                  <span className="text-muted-foreground">{STATUS_NAMES[status]}</span>
                </div>
              ))}
            </div>
          </CardHeader>

          <CardContent>
            <div className="rounded-md border flex overflow-hidden">
              {/* Scrollable: Angajat + zile */}
              <div className="overflow-x-auto flex-1 min-w-0">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((hg) => (
                      <TableRow key={hg.id}>
                        {hg.headers.map((header) => (
                          <TableHead
                            key={header.id}
                            className={`text-center ${
                              header.id === "name"
                                ? "sticky left-0 z-20 bg-card text-left min-w-[160px] border-r px-4"
                                : weekendMap.get(header.id)
                                  ? "w-8 min-w-[28px] px-1 bg-muted/40"
                                  : "w-8 min-w-[28px] px-1"
                            }`}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell
                              key={cell.id}
                              className={`text-center ${
                                cell.column.id === "name"
                                  ? "sticky left-0 z-20 bg-card text-left px-4 font-medium border-r"
                                  : weekendMap.get(cell.column.id)
                                    ? "p-1 bg-muted/40"
                                    : "p-1"
                              }`}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={table.getVisibleLeafColumns().length}
                          className="h-24 text-center text-muted-foreground"
                        >
                          {t("attendance.noEmployees")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Fix: Prez / Conc / Abs — în afara scroll-ului */}
              <div className="flex-none border-l">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-1 text-center w-10 text-muted-foreground">{t("attendance.columns.present")}</TableHead>
                      <TableHead className="px-1 text-center w-10 text-muted-foreground">{t("attendance.columns.leave")}</TableHead>
                      <TableHead className="px-1 text-center w-10 text-muted-foreground">{t("attendance.columns.absent")}</TableHead>
                      <TableHead className="px-1 text-center w-10 text-muted-foreground">{t("attendance.columns.paidLeave")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.length ? (
                      table.getRowModel().rows.map((row) => {
                        const vals = Object.values(row.original.days);
                        return (
                          <TableRow key={row.id}>
                            <TableCell className="px-1 text-center font-medium text-green-500">
                              {vals.filter((s) => s === "P").length}
                            </TableCell>
                            <TableCell className="px-1 text-center font-medium text-blue-500">
                              {vals.filter((s) => s === "CO" || s === "CM").length}
                            </TableCell>
                            <TableCell className="px-1 text-center font-medium text-red-500">
                              {vals.filter((s) => s === "A").length}
                            </TableCell>
                            <TableCell className="px-1 text-center font-medium text-purple-500">
                              {vals.filter((s) => s === "LP").length}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24" />
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
