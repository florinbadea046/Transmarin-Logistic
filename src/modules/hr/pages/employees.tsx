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
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Employee } from "@/modules/hr/types";

const columns: ColumnDef<Employee>[] = [
  {
    accessorKey: "name",
    enableHiding: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nume" />
    ),
    cell: ({ row }) => (
      <div className="font-medium whitespace-nowrap">
        {row.getValue("name")}
      </div>
    ),
  },
  {
    accessorKey: "position",
    enableHiding: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Funcție" />
    ),
    cell: ({ row }) => (
      <div className="whitespace-nowrap">{row.getValue("position")}</div>
    ),
  },
  {
    accessorKey: "department",
    enableHiding: false,
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
    accessorKey: "phone",
    header: "Telefon",
    cell: ({ row }) => (
      <div className="whitespace-nowrap">{row.getValue("phone")}</div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <div className="whitespace-nowrap">{row.getValue("email")}</div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "hireDate",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data angajării" />
    ),
    cell: ({ row }) => (
      <div className="whitespace-nowrap">
        {formatDate(row.getValue("hireDate"))}
      </div>
    ),
  },
  {
    accessorKey: "salary",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Salariu" />
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
];

export default function EmployeesPage() {
  const [data] = React.useState<Employee[]>(() =>
    getCollection<Employee>(STORAGE_KEYS.employees),
  );
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "name", desc: false },
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [search, setSearch] = React.useState("");
  const [dept, setDept] = React.useState("Toate");

  const departments = React.useMemo(() => {
    const uniq = Array.from(new Set(data.map((e) => e.department))).sort();
    return ["Toate", ...uniq];
  }, [data]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter: search },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setSearch,

    globalFilterFn: (row, columnId, value) => {
      const normalize = (s: string) =>
        s
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
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
    if (v === "Toate") {
      table.getColumn("department")?.setFilterValue(undefined);
    } else {
      table.getColumn("department")?.setFilterValue(v);
    }
    table.setPageIndex(0);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setSearch(v);
    table.setPageIndex(0);
  };

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Angajați</h1>
      </Header>
      <Main>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle>Lista Angajați</CardTitle>
              <span className="text-sm text-muted-foreground">
                {table.getFilteredRowModel().rows.length} angajați
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Input
                placeholder="Caută după nume, funcție sau email..."
                value={search}
                onChange={handleSearch}
                className="max-w-xs"
              />
              <Select value={dept} onValueChange={handleDeptChange}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Departament" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
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
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Niciun angajat găsit.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <DataTablePagination table={table} pageSizes={[5, 10, 20]} />
          </CardContent>
        </Card>
      </Main>
    </>
  );
}

function formatDate(d: string) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}`;
}
