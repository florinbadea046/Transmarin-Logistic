// ──────────────────────────────────────────────────────────
// A28. Istoric Activitati (Audit Log)
// Ruta: /activity-log
// Timeline CRUD pe entitatile Transport
// Filtrare: modul + entitate + tip actiune + interval date + cautare text
// Paginare: 20 per pagina
// Responsive pana la 320px
// i18n: useTranslation, fara diacritice in cod
// ──────────────────────────────────────────────────────────

import * as React from "react";
import { useTranslation } from "react-i18next";
import { format, parseISO, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { ro } from "date-fns/locale";
import {
  Plus, Pencil, Trash2, Filter, ChevronLeft, ChevronRight, Clock, Truck, User, FileText, Calendar, X,
  Wrench, Fuel, Receipt, Building2, Briefcase, CalendarDays, Cog, Repeat, Gauge, Search,
} from "lucide-react";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { loadAuditLog, type AuditEntry, type AuditAction, type AuditEntity } from "@/hooks/use-audit-log";
import { useMobile } from "@/hooks/use-mobile";

// ── Constante ──────────────────────────────────────────────

const PAGE_SIZE = 20;

type ModuleKey = "all" | "transport" | "fleet" | "accounting" | "hr";

const MODULE_ENTITIES: Record<string, AuditEntity[]> = {
  transport: ["driver", "truck", "order", "trip", "maintenance", "fuelLog", "recurringExpense", "mileage"],
  fleet: ["part", "service"],
  accounting: ["invoice", "supplier"],
  hr: ["employee", "leaveRequest"],
};

const ALL_ENTITIES: AuditEntity[] = Object.values(MODULE_ENTITIES).flat();

function getEntitiesForModule(module: ModuleKey): AuditEntity[] {
  if (module === "all") return ALL_ENTITIES;
  return MODULE_ENTITIES[module] ?? ALL_ENTITIES;
}

// ── Helpers vizuale ────────────────────────────────────────

const ACTION_CONFIG: Record<AuditAction, { color: string; icon: React.ReactNode }> = {
  create: {
    color: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200",
    icon: <Plus className="h-3.5 w-3.5" />,
  },
  update: {
    color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200",
    icon: <Pencil className="h-3.5 w-3.5" />,
  },
  delete: {
    color: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200",
    icon: <Trash2 className="h-3.5 w-3.5" />,
  },
};

const ENTITY_ICON: Record<AuditEntity, React.ReactNode> = {
  driver: <User className="h-4 w-4" />,
  truck: <Truck className="h-4 w-4" />,
  order: <FileText className="h-4 w-4" />,
  trip: <Calendar className="h-4 w-4" />,
  maintenance: <Wrench className="h-4 w-4" />,
  fuelLog: <Fuel className="h-4 w-4" />,
  invoice: <Receipt className="h-4 w-4" />,
  supplier: <Building2 className="h-4 w-4" />,
  employee: <Briefcase className="h-4 w-4" />,
  leaveRequest: <CalendarDays className="h-4 w-4" />,
  part: <Cog className="h-4 w-4" />,
  service: <Wrench className="h-4 w-4" />,
  recurringExpense: <Repeat className="h-4 w-4" />,
  mileage: <Gauge className="h-4 w-4" />,
};

// ── Componenta entry ───────────────────────────────────────

function AuditEntryCard({ entry, isMobile, t }: {
  entry: AuditEntry;
  isMobile: boolean;
  t: (k: string) => string;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const action = ACTION_CONFIG[entry.action];

  const formattedTime = (() => {
    try {
      return format(parseISO(entry.timestamp), isMobile ? "dd.MM.yy HH:mm" : "dd MMM yyyy, HH:mm:ss", { locale: ro });
    } catch {
      return entry.timestamp;
    }
  })();

  return (
    <div className="flex gap-3 min-w-0">
      {/* Linia verticala + icon */}
      <div className="flex flex-col items-center shrink-0">
        <div className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full border-2 bg-background shrink-0",
          entry.action === "create" ? "border-green-400 text-green-600" :
          entry.action === "update" ? "border-blue-400 text-blue-600" :
          "border-red-400 text-red-600",
        )}>
          {ENTITY_ICON[entry.entity]}
        </div>
        <div className="mt-1 w-px flex-1 bg-border" />
      </div>

      {/* Continut */}
      <Card className="mb-3 flex-1 min-w-0">
        <CardContent className="pt-3 pb-3 px-3 min-w-0">
          <div className="flex flex-wrap items-start gap-2 min-w-0">
            {/* Badge actiune */}
            <Badge variant="outline" className={cn("flex items-center gap-1 shrink-0 text-xs", action.color)}>
              {action.icon}
              {t(`activityLog.actions.${entry.action}`)}
            </Badge>

            {/* Entitate + label */}
            <span className="text-sm font-medium truncate min-w-0">
              {t(`activityLog.entities.${entry.entity}`)}:&nbsp;
              <span className="text-primary">{entry.entityLabel}</span>
            </span>

            {/* Timestamp */}
            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              <Clock className="h-3 w-3" />
              {formattedTime}
            </span>
          </div>

          {/* Detalii — traduse la afisare din detailKey (cu interpolare) sau fallback la details */}
          {(entry.detailKey || entry.details) && (
            <p className="mt-1.5 text-xs text-muted-foreground break-words">
              {entry.detailKey
                ? (t as (k: string, o?: Record<string, unknown>) => string)(entry.detailKey, entry.detailParams)
                : entry.details}
            </p>
          )}

          {/* Expand old/new value */}
          {(entry.oldValue || entry.newValue) && (
            <div className="mt-2">
              <button
                className="text-xs text-primary hover:underline"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? t("activityLog.hideDetails") : t("activityLog.showDetails")}
              </button>
              {expanded && (
                <div className={cn("mt-2 grid gap-2 text-xs", !isMobile && "grid-cols-2")}>
                  {entry.oldValue && (
                    <div className="rounded border bg-muted/30 p-2 min-w-0">
                      <p className="font-medium text-muted-foreground mb-1">{t("activityLog.before")}</p>
                      <pre className="whitespace-pre-wrap break-all font-mono text-[10px]">
                        {JSON.stringify(entry.oldValue, null, 2)}
                      </pre>
                    </div>
                  )}
                  {entry.newValue && (
                    <div className="rounded border bg-muted/30 p-2 min-w-0">
                      <p className="font-medium text-muted-foreground mb-1">{t("activityLog.after")}</p>
                      <pre className="whitespace-pre-wrap break-all font-mono text-[10px]">
                        {JSON.stringify(entry.newValue, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Pagina principala ──────────────────────────────────────

export default function ActivityLogPage() {
  const { t } = useTranslation();
  const isMobile = useMobile(640);

  const [filterModule, setFilterModule] = React.useState<ModuleKey>("all");
  const [filterEntity, setFilterEntity] = React.useState<AuditEntity | "all">("all");
  const [filterAction, setFilterAction] = React.useState<AuditAction | "all">("all");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [page, setPage] = React.useState(1);

  // Reincarca la mount
  const [entries, setEntries] = React.useState<AuditEntry[]>([]);
  React.useEffect(() => {
    setEntries(loadAuditLog());
  }, []);

  // Cand modulul se schimba, reset entitatea daca nu mai apartine modulului
  React.useEffect(() => {
    if (filterEntity !== "all") {
      const available = getEntitiesForModule(filterModule);
      if (!available.includes(filterEntity)) {
        setFilterEntity("all");
      }
    }
  }, [filterModule, filterEntity]);

  // Entitati disponibile in functie de modul
  const availableEntities = React.useMemo(() => getEntitiesForModule(filterModule), [filterModule]);

  // Filtrare
  const filtered = React.useMemo(() => {
    const lowerSearch = searchQuery.toLowerCase().trim();
    return entries.filter((e) => {
      if (filterEntity !== "all" && e.entity !== filterEntity) return false;
      if (filterAction !== "all" && e.action !== filterAction) return false;

      // Filtru modul: verificam daca entitatea apartine modulului selectat
      if (filterModule !== "all") {
        const moduleEntities = MODULE_ENTITIES[filterModule] ?? [];
        if (!moduleEntities.includes(e.entity)) return false;
      }

      // Filtru date
      if (dateFrom) {
        try {
          const from = startOfDay(new Date(dateFrom));
          const entryDate = parseISO(e.timestamp);
          if (isBefore(entryDate, from)) return false;
        } catch { /* ignore invalid date */ }
      }
      if (dateTo) {
        try {
          const to = endOfDay(new Date(dateTo));
          const entryDate = parseISO(e.timestamp);
          if (isAfter(entryDate, to)) return false;
        } catch { /* ignore invalid date */ }
      }

      // Cautare text
      if (lowerSearch) {
        const label = (e.entityLabel ?? "").toLowerCase();
        const details = (e.details ?? "").toLowerCase();
        const detailKey = (e.detailKey ?? "").toLowerCase();
        const detailParamsStr = e.detailParams ? Object.values(e.detailParams).join(" ").toLowerCase() : "";
        if (
          !label.includes(lowerSearch) &&
          !details.includes(lowerSearch) &&
          !detailKey.includes(lowerSearch) &&
          !detailParamsStr.includes(lowerSearch)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [entries, filterModule, filterEntity, filterAction, dateFrom, dateTo, searchQuery]);

  // Paginare
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetFilters = () => {
    setFilterModule("all");
    setFilterEntity("all");
    setFilterAction("all");
    setDateFrom("");
    setDateTo("");
    setSearchQuery("");
    setPage(1);
  };

  const hasFilters = filterModule !== "all" || filterEntity !== "all" || filterAction !== "all" || dateFrom !== "" || dateTo !== "" || searchQuery !== "";

  // Reset page when filters change
  React.useEffect(() => { setPage(1); }, [filterModule, filterEntity, filterAction, dateFrom, dateTo, searchQuery]);

  const modules: { value: ModuleKey; label: string }[] = [
    { value: "all", label: t("activityLog.modules.all") },
    { value: "transport", label: t("activityLog.modules.transport") },
    { value: "fleet", label: t("activityLog.modules.fleet") },
    { value: "accounting", label: t("activityLog.modules.accounting") },
    { value: "hr", label: t("activityLog.modules.hr") },
  ];

  const entityOptions: { value: AuditEntity | "all"; label: string }[] = [
    { value: "all", label: t("activityLog.filters.allEntities") },
    ...availableEntities.map((e) => ({
      value: e,
      label: t(`activityLog.entities.${e}`),
    })),
  ];

  const actions: { value: AuditAction | "all"; label: string }[] = [
    { value: "all", label: t("activityLog.filters.allActions") },
    { value: "create", label: t("activityLog.actions.create") },
    { value: "update", label: t("activityLog.actions.update") },
    { value: "delete", label: t("activityLog.actions.delete") },
  ];

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("activityLog.title")}</h1>
      </Header>

      <Main>
        {/* Toolbar filtre */}
        <div className={cn(
          "mb-6 flex gap-2",
          isMobile ? "flex-col" : "flex-wrap items-center",
        )}>
          <div className="flex items-center gap-1 shrink-0 text-sm text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            <span>{t("activityLog.filters.label")}</span>
          </div>

          {/* Modul */}
          <Select value={filterModule} onValueChange={(v) => setFilterModule(v as ModuleKey)}>
            <SelectTrigger className={cn(isMobile ? "w-full" : "w-[170px]")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {modules.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Entitate */}
          <Select value={filterEntity} onValueChange={(v) => setFilterEntity(v as AuditEntity | "all")}>
            <SelectTrigger className={cn(isMobile ? "w-full" : "w-[180px]")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {entityOptions.map((e) => (
                <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Actiune */}
          <Select value={filterAction} onValueChange={(v) => setFilterAction(v as AuditAction | "all")}>
            <SelectTrigger className={cn(isMobile ? "w-full" : "w-[160px]")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {actions.map((a) => (
                <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date range */}
          <div className={cn("flex gap-2", isMobile ? "w-full" : "")}>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder={t("activityLog.filters.dateFrom")}
              className={cn("h-9", isMobile ? "flex-1" : "w-[145px]")}
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder={t("activityLog.filters.dateTo")}
              className={cn("h-9", isMobile ? "flex-1" : "w-[145px]")}
            />
          </div>

          {/* Cautare text */}
          <div className={cn("relative", isMobile ? "w-full" : "w-[200px]")}>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("activityLog.filters.search")}
              className="pl-8 h-9"
            />
          </div>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className={cn(isMobile && "w-full")}>
              <X className="mr-1 h-3.5 w-3.5" />
              {t("activityLog.filters.reset")}
            </Button>
          )}

          <span className={cn("text-xs text-muted-foreground", !isMobile && "ml-auto")}>
            {t("activityLog.totalEntries", { count: filtered.length })}
          </span>
        </div>

        {/* Timeline */}
        {paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <Clock className="h-10 w-10 opacity-20" />
            <p className="text-sm">{t("activityLog.empty")}</p>
          </div>
        ) : (
          <div className="min-w-0">
            {paginated.map((entry) => (
              <AuditEntryCard key={entry.id} entry={entry} isMobile={isMobile} t={t} />
            ))}
          </div>
        )}

        {/* Paginare */}
        {totalPages > 1 && (
          <div className={cn(
            "mt-4 flex items-center gap-2",
            isMobile ? "justify-between" : "justify-center",
          )}>
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              {!isMobile && t("activityLog.pagination.prev")}
            </Button>
            <span className="text-sm text-muted-foreground">
              {t("activityLog.pagination.pageOf", { page, total: totalPages })}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {!isMobile && t("activityLog.pagination.next")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </Main>
    </>
  );
}
