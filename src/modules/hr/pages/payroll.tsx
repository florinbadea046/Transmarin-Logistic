import * as React from "react";
import { useTranslation } from "react-i18next";
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
import { getMonthOptions, currentMonth } from "../payroll/payroll-shared";
import {
  createPayrollColumns,
  createBonusColumns,
} from "../components/payroll-columns";
import { PayrollExportMenu } from "../components/payroll-export-menu";

const ALL = "__ALL__";

export default function PayrollPage() {
  const { t, i18n } = useTranslation();
  const monthOptions = React.useMemo(
    () => getMonthOptions(i18n.language.startsWith("en") ? "en-GB" : "ro-RO"),
    [i18n.language],
  );
  const [selectedMonth, setSelectedMonth] = React.useState(currentMonth());
  const { employees, payrollRows, bonusRows, refreshData } =
    usePayrollData(selectedMonth);

  const [payrollDept, setPayrollDept] = React.useState(ALL);
  const [bonusTypeFilter, setBonusTypeFilter] = React.useState(ALL);
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

  const payrollColumns = React.useMemo(() => createPayrollColumns(t), [t]);
  const bonusColumns = React.useMemo(() => createBonusColumns(t), [t]);

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
    payrollTable.getColumn("department")?.setFilterValue(v === ALL ? undefined : v);
    payrollTable.setPageIndex(0);
  };

  const handleBonusTypeChange = (v: string) => {
    setBonusTypeFilter(v);
    bonusTable.getColumn("type")?.setFilterValue(v === ALL ? undefined : v);
    bonusTable.setPageIndex(0);
  };

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("payroll.title")}</h1>
      </Header>
      <Main className="space-y-6">
        {/* Card 1: Calcul Salarizare */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>{t("payroll.cardTitle")}</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <PayrollExportMenu rows={payrollRows} selectedMonth={selectedMonth} />
                <Select value={selectedMonth} onValueChange={handleMonthChange}>
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
                <Select value={payrollDept} onValueChange={handlePayrollDeptChange}>
                  <SelectTrigger className="flex-1 min-w-[140px] sm:w-44">
                    <SelectValue placeholder={t("payroll.departmentPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>{t("payroll.allDepartments")}</SelectItem>
                    {EMPLOYEE_DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>{t(`departments.${d}`)}</SelectItem>
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
                        {t("payroll.noRecords")}
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
              <CardTitle>{t("payroll.bonusCardTitle")}</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={bonusTypeFilter} onValueChange={handleBonusTypeChange}>
                  <SelectTrigger className="flex-1 min-w-[140px] sm:w-44">
                    <SelectValue placeholder={t("payroll.columns.type")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>{t("payroll.allTypes")}</SelectItem>
                    {(Object.keys(t("payroll.types", { returnObjects: true })) as Bonus["type"][]).map(
                      (val) => (
                        <SelectItem key={val} value={val}>{t(`payroll.types.${val}`)}</SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={() => setAddBonusOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("payroll.add")}
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
                        {t("payroll.noRecordsMonth")}
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
