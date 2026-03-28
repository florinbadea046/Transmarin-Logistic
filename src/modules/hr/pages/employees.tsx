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
import { Upload } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import OrgChart from "./_components/org-chart";
import { EmployeeImportDialog } from "../components/employee-import-dialog";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { DataTablePagination } from "@/components/data-table/pagination";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS, EMPLOYEE_DEPARTMENTS } from "@/data/mock-data";
import type { Employee } from "@/modules/hr/types";
import { formatDate } from "@/utils/format";
import EmployeeDialog from "../components/employee-dialog";
import { EmployeeExportMenu } from "../components/employee-export-menu";
import { EmployeeRow } from "../components/employee-row";
import { getEmployeeDepartmentLabel } from "../utils/department-label";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const ALL_DEPARTMENTS = "__all__";

// ── Coloane ────────────────────────────────────────────────

function getColumns(t: (key: string) => string): ColumnDef<Employee>[] {
  return [
    {
      accessorKey: "name",
      enableHiding: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("employees.fields.name")} />
      ),
      cell: ({ row }) => (
        <div className="font-medium whitespace-nowrap">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "position",
      enableHiding: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("employees.fields.position")} />
      ),
      cell: ({ row }) => (
        <div className="whitespace-nowrap">{row.getValue("position")}</div>
      ),
    },
    {
      accessorKey: "department",
      enableHiding: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("employees.fields.department")} />
      ),
      cell: ({ row }) => (
        <Badge variant="secondary">
          {getEmployeeDepartmentLabel(t, String(row.getValue("department")))}
        </Badge>
      ),
      filterFn: (row, id, value) => {
        if (!value || value === ALL_DEPARTMENTS) return true;
        return row.getValue(id) === value;
      },
    },
    {
      accessorKey: "phone",
      header: t("employees.fields.phone"),
      cell: ({ row }) => (
        <div className="whitespace-nowrap">{row.getValue("phone")}</div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "email",
      header: t("employees.fields.email"),
      cell: ({ row }) => (
        <div className="whitespace-nowrap">{row.getValue("email")}</div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "hireDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("employees.fields.hireDate")} />
      ),
      cell: ({ row }) => (
        <div className="whitespace-nowrap">{formatDate(row.getValue("hireDate"))}</div>
      ),
    },
    {
      accessorKey: "salary",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("employees.fields.salary")} />
      ),
      cell: ({ row }) => (
        <div className="whitespace-nowrap font-medium">
          {(row.getValue("salary") as number).toLocaleString("ro-RO")} RON
        </div>
      ),
      sortingFn: (a, b, id) => {
        const av = (a.getValue(id) as number) ?? 0;
        const bv = (b.getValue(id) as number) ?? 0;
        return av === bv ? 0 : av > bv ? 1 : -1;
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

// ── Pagina ─────────────────────────────────────────────────

export default function EmployeesPage() {
  const { t } = useTranslation();
  const isMobile = useMobile(640);
  const [data, setData] = React.useState<Employee[]>(() =>
    getCollection<Employee>(STORAGE_KEYS.employees),
  );
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "name", desc: false }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [search, setSearch] = React.useState("");
  const [dept, setDept] = React.useState(ALL_DEPARTMENTS);
  const [importOpen, setImportOpen] = React.useState(false);

  const columns = React.useMemo(() => getColumns(t), [t]);

  const departments = React.useMemo(() => {
    return [
      { value: ALL_DEPARTMENTS, label: t("employees.filters.all") },
      ...EMPLOYEE_DEPARTMENTS.map((department) => ({
        value: department,
        label: getEmployeeDepartmentLabel(t, department),
      })),
    ];
  }, [t]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter: search },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setSearch,
    globalFilterFn: (row, _columnId, value) => {
      const normalize = (s: string) =>
        s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const q = normalize(String(value));
      if (!q) return true;
      return (
        normalize(String(row.getValue("name"))).includes(q) ||
        normalize(String(row.getValue("position"))).includes(q) ||
        normalize(String(row.getValue("email"))).includes(q)
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 5, pageIndex: 0 } },
  });

  const handleDeptChange = (v: string) => {
    setDept(v);
    table.getColumn("department")?.setFilterValue(v === ALL_DEPARTMENTS ? undefined : v);
    table.setPageIndex(0);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    table.setPageIndex(0);
  };

  const refreshData = () => setData(getCollection<Employee>(STORAGE_KEYS.employees));

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("employees.title")}</h1>
      </Header>
      <Main>
        <Tabs defaultValue="list">
        <Card>
          <CardHeader>
            <div className={cn(
              "flex flex-wrap gap-2",
              isMobile ? "flex-col" : "items-center justify-between",
            )}>
              <CardTitle>{t("employees.listTitle")}</CardTitle>
              <span className="text-sm text-muted-foreground">
                {t("employees.count", { count: table.getFilteredRowModel().rows.length })}
              </span>
              <div className={cn("flex items-center gap-2", isMobile && "w-full justify-end")}>
                {isMobile ? (
                  <EmployeeExportMenu
                    employees={table.getFilteredRowModel().rows.map((row) => row.original)}
                    iconOnly
                  />
                ) : (
                  <EmployeeExportMenu
                    employees={table.getFilteredRowModel().rows.map((row) => row.original)}
                  />
                )}
                <Button
                  variant="outline"
                  size={isMobile ? "icon" : "sm"}
                  onClick={() => setImportOpen(true)}
                  title={t("employees.import.button")}
                >
                  <Upload className={cn("h-3.5 w-3.5", !isMobile && "mr-1.5")} />
                  {!isMobile && t("employees.import.button")}
                </Button>
                <EmployeeDialog mode="add" onAdd={refreshData} />
              </div>
            </div>
            <TabsList className="mt-3">
              <TabsTrigger value="list">{t("employees.viewList")}</TabsTrigger>
              <TabsTrigger value="orgchart">{t("employees.viewOrgChart")}</TabsTrigger>
            </TabsList>
          </CardHeader>

          <TabsContent value="list" asChild>
            <CardContent className="space-y-4">
              <div className={cn("flex flex-wrap gap-2", isMobile && "flex-col")}>
                <Input
                  placeholder={t("employees.placeholders.search")}
                  value={search}
                  onChange={handleSearch}
                  className={isMobile ? "w-full" : "max-w-xs"}
                />
                <Select value={dept} onValueChange={handleDeptChange}>
                  <SelectTrigger className={isMobile ? "w-full" : "w-44"}>
                    <SelectValue placeholder={t("employees.fields.department")} />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-md border overflow-x-auto min-w-0">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder ? null : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <EmployeeRow key={row.id} row={row} setData={setData} />
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={table.getVisibleLeafColumns().length}
                          className="h-24 text-center text-muted-foreground"
                        >
                          {t("employees.empty")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <DataTablePagination table={table} pageSizes={[5, 10, 20]} />
            </CardContent>
          </TabsContent>
          <TabsContent value="orgchart">
            <CardContent>
              <OrgChart />
            </CardContent>
          </TabsContent>
        </Card>
        </Tabs>
      </Main>

      <EmployeeImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={refreshData}
        isMobile={isMobile}
      />
    </>
  );
}