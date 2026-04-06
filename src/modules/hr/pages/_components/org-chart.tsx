import * as React from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, ChevronDown, Users, Mail, Phone, Calendar, Banknote, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Employee } from "@/modules/hr/types";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import { cn } from "@/lib/utils";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]?.toUpperCase() || "").join("");
}

function getChildren(all: Employee[], parentId: string) {
  return all.filter((e) => e.managerId === parentId);
}

function countAll(all: Employee[], parentId: string): number {
  const ch = getChildren(all, parentId);
  return ch.reduce((s, c) => s + 1 + countAll(all, c.id), 0);
}

function matchesSearch(emp: Employee, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    emp.name.toLowerCase().includes(q) ||
    emp.position.toLowerCase().includes(q) ||
    emp.department.toLowerCase().includes(q) ||
    emp.email.toLowerCase().includes(q)
  );
}

function hasMatchInSubtree(all: Employee[], emp: Employee, query: string): boolean {
  if (matchesSearch(emp, query)) return true;
  return getChildren(all, emp.id).some((c) => hasMatchInSubtree(all, c, query));
}

// ── Departament culori (consistent) ─────────────────────────────────────────

const DEPT_COLORS: Record<string, string> = {
  Management: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/20",
  Administrativ: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20",
  Transport: "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/20",
  Dispecerat: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20",
  Service: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/20",
  Contabilitate: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/20",
};

function deptColor(dept: string) {
  return DEPT_COLORS[dept] ?? "bg-muted text-muted-foreground border-border";
}

// ── Row component ────────────────────────────────────────────────────────────

function OrgRow({
  emp, all, depth, expanded, toggle, onClick, search,
}: {
  emp: Employee;
  all: Employee[];
  depth: number;
  expanded: Record<string, boolean>;
  toggle: (id: string) => void;
  onClick: (e: Employee) => void;
  search: string;
}) {
  const children = getChildren(all, emp.id);
  const isExpanded = expanded[emp.id] ?? (depth < 1);
  const hasChildren = children.length > 0;
  const totalCount = hasChildren ? countAll(all, emp.id) : 0;

  // Filter: hide rows that don't match search
  if (search && !hasMatchInSubtree(all, emp, search)) return null;

  // Auto-expand when searching
  const effectiveExpanded = search ? true : isExpanded;

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-3 py-2.5 px-3 cursor-pointer transition-colors group",
          "hover:bg-accent/50 active:bg-accent",
          depth === 0 && "bg-muted/40",
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => onClick(emp)}
      >
        {/* Expand toggle */}
        {hasChildren ? (
          <button
            type="button"
            className={cn(
              "shrink-0 h-6 w-6 flex items-center justify-center rounded-md transition-colors",
              "hover:bg-primary/10 text-muted-foreground hover:text-primary",
            )}
            onClick={(e) => { e.stopPropagation(); toggle(emp.id); }}
          >
            {effectiveExpanded
              ? <ChevronDown className="h-4 w-4" />
              : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="w-6 shrink-0" />
        )}

        {/* Avatar */}
        <Avatar className="shrink-0 h-8 w-8 transition-shadow group-hover:ring-2 group-hover:ring-primary/20">
          <AvatarFallback className="text-xs font-semibold">
            {getInitials(emp.name)}
          </AvatarFallback>
        </Avatar>

        {/* Info — stacked vertically, never overflows */}
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="font-medium text-sm leading-tight truncate">
            {emp.name}
            {hasChildren && (
              <span className="text-[10px] text-muted-foreground font-normal ml-1">({totalCount})</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] text-muted-foreground truncate">{emp.position}</span>
            <span className={cn("shrink-0 inline-block text-[9px] font-medium px-1.5 py-px rounded-full border", deptColor(emp.department))}>
              {emp.department}
            </span>
          </div>
        </div>
      </div>

      {/* Children */}
      {hasChildren && effectiveExpanded && (
        <div className="relative">
          {/* Vertical connector line */}
          <div
            className="absolute top-0 bottom-3 w-px bg-border/50"
            style={{ left: `${20 + depth * 16}px` }}
          />
          {children.map((child) => (
            <OrgRow
              key={child.id} emp={child} all={all} depth={depth + 1}
              expanded={expanded} toggle={toggle} onClick={onClick} search={search}
            />
          ))}
        </div>
      )}
    </>
  );
}

// ── Detail dialog ────────────────────────────────────────────────────────────

function DetailDialog({ employee, all, onClose }: { employee: Employee | null; all: Employee[]; onClose: () => void }) {
  const { t } = useTranslation();
  if (!employee) return null;

  const manager = all.find((e) => e.id === employee.managerId);
  const directs = getChildren(all, employee.id);

  return (
    <Dialog open={!!employee} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="items-center text-center pb-0">
          <Avatar className="h-16 w-16 mx-auto ring-4 ring-background shadow-lg">
            <AvatarFallback className="text-xl font-bold">{getInitials(employee.name)}</AvatarFallback>
          </Avatar>
          <DialogTitle className="text-lg pt-3">{employee.name}</DialogTitle>
          <DialogDescription className="flex items-center justify-center gap-2 flex-wrap">
            <span>{employee.position}</span>
            <Badge variant="outline" className={cn("text-[10px] border", deptColor(employee.department))}>
              {employee.department}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-3">
          {/* Contact */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <span className="truncate">{employee.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <span>{employee.phone}</span>
            </div>
          </div>

          {/* Details */}
          <div className="rounded-lg border p-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>{t("orgChart.detail.hireDate")}</span>
              </div>
              <span className="font-medium">{employee.hireDate}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Banknote className="h-3.5 w-3.5" />
                <span>{t("orgChart.detail.salary")}</span>
              </div>
              <span className="font-medium">{(employee.salary ?? 0).toLocaleString("ro-RO")} RON</span>
            </div>
          </div>

          {/* Relationships */}
          {(manager || directs.length > 0) && (
            <div className="rounded-lg border p-3 space-y-2 text-sm">
              {manager && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("orgChart.detail.manager")}</span>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[8px]">{getInitials(manager.name)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-xs">{manager.name}</span>
                  </div>
                </div>
              )}
              {directs.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("orgChart.detail.directs")}</span>
                  <span className="font-medium">{directs.length}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

const OrgChart: React.FC = () => {
  const { t } = useTranslation();
  const [selected, setSelected] = React.useState<Employee | null>(null);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [search, setSearch] = React.useState("");

  const employees = React.useMemo(() => getCollection<Employee>(STORAGE_KEYS.employees), []);
  const roots = employees.filter((e) => !e.managerId);

  const handleToggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  };

  const expandAll = () => {
    const map: Record<string, boolean> = {};
    for (const emp of employees) map[emp.id] = true;
    setExpanded(map);
  };

  const collapseAll = () => {
    const map: Record<string, boolean> = {};
    for (const emp of employees) map[emp.id] = false;
    for (const r of roots) map[r.id] = true;
    setExpanded(map);
  };

  if (roots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <Users className="h-10 w-10 opacity-40" />
        <p className="text-sm">{t("orgChart.noRoot")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("orgChart.search")}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={expandAll}>
          {t("orgChart.expandAll")}
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={collapseAll}>
          {t("orgChart.collapseAll")}
        </Button>
        <span className="text-xs text-muted-foreground ml-auto tabular-nums">
          {employees.length} {t("orgChart.employees")}
        </span>
      </div>

      {/* List */}
      <div className="rounded-xl border overflow-hidden">
        <div>
          {roots.map((root) => (
            <OrgRow
              key={root.id} emp={root} all={employees} depth={0}
              expanded={expanded} toggle={handleToggle} onClick={setSelected} search={search}
            />
          ))}
        </div>

        {/* Empty state */}
        {search && !roots.some((r) => hasMatchInSubtree(employees, r, search)) && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {t("orgChart.noResults")}
          </div>
        )}
      </div>

      <DetailDialog employee={selected} all={employees} onClose={() => setSelected(null)} />
    </div>
  );
};

export default OrgChart;
