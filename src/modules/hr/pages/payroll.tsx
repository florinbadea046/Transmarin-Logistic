import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
  type ColumnFiltersState,
  useReactTable,
} from "@tanstack/react-table";
import { Plus } from "lucide-react";
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
import { DataTablePagination } from "@/components/data-table/pagination";
import { EMPLOYEE_DEPARTMENTS } from "@/data/mock-data";
import type { Bonus } from "@/modules/hr/types";
import { BonusTableRow } from "../components/bonus-row";
import BonusDialog from "../components/bonus-dialog";
import { usePayrollData } from "../hooks/use-payroll-data";
import { BONUS_TYPE_LABELS, MONTH_OPTIONS, currentMonth } from "../payroll/payroll-shared";
import {
  payrollColumns,
  bonusColumns,
} from "../components/payroll-columns";

export default function PayrollPage() {
  const [selectedMonth, setSelectedMonth] = React.useState(currentMonth);
  const { employees, payrollRows, bonusRows, refreshData } =
    usePayrollData(selectedMonth);

  const [payrollDept, setPayrollDept] = React.useState("Toate");
  const [bonusTypeFilter, setBonusTypeFilter] = React.useState("Toate");
  const [addBonusOpen, setAddBonusOpen] = React.useState(false);

  const [payrollSorting, setPayrollSorting] = React.useState<SortingState>([]);
  const [payrollFilters, setPayrollFilters] =
    React.useState<ColumnFiltersState>([]);
  const [bonusSorting, setBonusSorting] = React.useState<SortingState>([
    { id: "date", desc: true },
  ]);
  const [bonusFilters, setBonusFilters] = React.useState<ColumnFiltersState>(
    [],
  );

  const payrollTable = useReactTable({
    data: payrollRows,
    columns: payrollColumns,
    state: { sorting: payrollSorting, columnFilters: payrollFilters },
    onSortingChange: setPayrollSorting,
    onColumnFiltersChange: setPayrollFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10, pageIndex: 0 } },
  });

  const bonusTable = useReactTable({
    data: bonusRows,
    columns: bonusColumns,
    state: { sorting: bonusSorting, columnFilters: bonusFilters },
    onSortingChange: setBonusSorting,
    onColumnFiltersChange: setBonusFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10, pageIndex: 0 } },
  });

  const handleMonthChange = (v: string) => {
    setSelectedMonth(v);
    payrollTable.setPageIndex(0);
    bonusTable.setPageIndex(0);
  };

  const handlePayrollDeptChange = (v: string) => {
    setPayrollDept(v);
    payrollTable.getColumn("department")?.setFilterValue(v === "Toate" ? undefined : v);
    payrollTable.setPageIndex(0);
  };

  const handleBonusTypeChange = (v: string) => {
    setBonusTypeFilter(v);
    bonusTable.getColumn("type")?.setFilterValue(v === "Toate" ? undefined : v);
    bonusTable.setPageIndex(0);
  };

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Salarizare</h1>
      </Header>
      <Main className="space-y-6">
        {/* Card 1: Calcul Salarizare */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Calcul Salarizare</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={selectedMonth} onValueChange={handleMonthChange}>
                  <SelectTrigger className="flex-1 min-w-[140px] sm:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={payrollDept} onValueChange={handlePayrollDeptChange}>
                  <SelectTrigger className="flex-1 min-w-[140px] sm:w-44">
                    <SelectValue placeholder="Departament" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Toate", ...EMPLOYEE_DEPARTMENTS].map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  {payrollTable.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id}>
                      {hg.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {payrollTable.getRowModel().rows.length ? (
                    payrollTable.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={payrollColumns.length}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Nicio înregistrare.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <DataTablePagination table={payrollTable} pageSizes={[5, 10, 20]} />
          </CardContent>
        </Card>

        {/* Card 2: Bonusuri / Penalizări */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Bonusuri / Penalizări</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={bonusTypeFilter} onValueChange={handleBonusTypeChange}>
                  <SelectTrigger className="flex-1 min-w-[140px] sm:w-44">
                    <SelectValue placeholder="Tip" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Toate">Toate tipurile</SelectItem>
                    {(Object.entries(BONUS_TYPE_LABELS) as [Bonus["type"], string][]).map(
                      ([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={() => setAddBonusOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adaugă
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  {bonusTable.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id}>
                      {hg.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {bonusTable.getRowModel().rows.length ? (
                    bonusTable.getRowModel().rows.map((row) => (
                      <BonusTableRow
                        key={row.id}
                        row={row}
                        employees={employees}
                        onRefresh={refreshData}
                      />
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={bonusColumns.length}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Nicio înregistrare pentru luna selectată.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <DataTablePagination table={bonusTable} pageSizes={[5, 10, 20]} />
          </CardContent>
        </Card>

        <BonusDialog
          mode="add"
          employees={employees}
          open={addBonusOpen}
          onOpenChange={setAddBonusOpen}
          onSave={refreshData}
        />
      </Main>
    </>
  );
}
