import { useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Employee } from "@/modules/hr/types";

const PAGE_SIZES = [5, 10, 20];

type SortKey = "name" | "position" | "department" | "hireDate" | "salary";
type SortDir = "asc" | "desc";

export default function EmployeesPage() {
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("Toate");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [employees] = useState<Employee[]>(() =>
    getCollection<Employee>(STORAGE_KEYS.employees),
  );

  const departments = useMemo(() => {
    const uniq = Array.from(new Set(employees.map((e) => e.department))).sort();
    return ["Toate", ...uniq];
  }, [employees]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...employees]
      .filter(
        (e) =>
          (dept === "Toate" || e.department === dept) &&
          (e.name.toLowerCase().includes(q) ||
            e.email.toLowerCase().includes(q) ||
            e.position.toLowerCase().includes(q)),
      )
      .sort((a, b) => {
        if (sortKey === "salary") {
          const an = Number(a.salary);
          const bn = Number(b.salary);
          if (an < bn) return sortDir === "asc" ? -1 : 1;
          if (an > bn) return sortDir === "asc" ? 1 : -1;
          return 0;
        }
        const av = String(a[sortKey] ?? "");
        const bv = String(b[sortKey] ?? "");
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
  }, [employees, search, dept, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
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
                {filtered.length} angajați
              </span>
            </div>

            {/* Filtre */}
            <div className="flex flex-wrap gap-2 mt-3">
              <Input
                placeholder="Caută după nume, funcție sau email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="max-w-xs"
              />
              <Select
                value={dept}
                onValueChange={(v) => {
                  setDept(v);
                  setPage(1);
                }}
              >
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
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} / pagină
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent>
            {/* Tabel */}
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th
                      className="p-3 text-left font-semibold cursor-pointer select-none hover:bg-muted/60 whitespace-nowrap"
                      onClick={() => handleSort("name")}
                    >
                      Nume{" "}
                      {sortKey === "name"
                        ? sortDir === "asc"
                          ? "▲"
                          : "▼"
                        : "↕"}
                    </th>
                    <th
                      className="p-3 text-left font-semibold cursor-pointer select-none hover:bg-muted/60 whitespace-nowrap"
                      onClick={() => handleSort("position")}
                    >
                      Funcție{" "}
                      {sortKey === "position"
                        ? sortDir === "asc"
                          ? "▲"
                          : "▼"
                        : "↕"}
                    </th>
                    <th
                      className="p-3 text-left font-semibold cursor-pointer select-none hover:bg-muted/60 whitespace-nowrap"
                      onClick={() => handleSort("department")}
                    >
                      Departament{" "}
                      {sortKey === "department"
                        ? sortDir === "asc"
                          ? "▲"
                          : "▼"
                        : "↕"}
                    </th>
                    <th className="p-3 text-left font-semibold whitespace-nowrap">
                      Telefon
                    </th>
                    <th className="p-3 text-left font-semibold whitespace-nowrap">
                      Email
                    </th>
                    <th
                      className="p-3 text-left font-semibold cursor-pointer select-none hover:bg-muted/60 whitespace-nowrap"
                      onClick={() => handleSort("hireDate")}
                    >
                      Data angajării{" "}
                      {sortKey === "hireDate"
                        ? sortDir === "asc"
                          ? "▲"
                          : "▼"
                        : "↕"}
                    </th>
                    <th
                      className="p-3 text-left font-semibold cursor-pointer select-none hover:bg-muted/60 whitespace-nowrap"
                      onClick={() => handleSort("salary")}
                    >
                      Salariu{" "}
                      {sortKey === "salary"
                        ? sortDir === "asc"
                          ? "▲"
                          : "▼"
                        : "↕"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="p-8 text-center text-muted-foreground"
                      >
                        Niciun angajat găsit.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((emp, i) => (
                      <tr
                        key={emp.id}
                        className={`border-t hover:bg-muted/50 transition-colors ${i % 2 !== 0 ? "bg-muted/20" : ""}`}
                      >
                        <td className="p-3 font-medium whitespace-nowrap">
                          {emp.name}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {emp.position}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <Badge variant="secondary">{emp.department}</Badge>
                        </td>
                        <td className="p-3 whitespace-nowrap">{emp.phone}</td>
                        <td className="p-3 whitespace-nowrap">{emp.email}</td>
                        <td className="p-3 whitespace-nowrap">
                          {formatDate(emp.hireDate)}
                        </td>
                        <td className="p-3 whitespace-nowrap font-medium">
                          {emp.salary.toLocaleString("ro-RO")} RON
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginare */}
            <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">
                Pagina {page} din {totalPages}
              </span>
              <div className="flex gap-1 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  «
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                >
                  ‹
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages}
                >
                  ›
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                >
                  »
                </Button>
              </div>
            </div>
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
