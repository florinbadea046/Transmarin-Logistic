// ──────────────────────────────────────────────────────────
// C19. Istoric Activitati HR (Audit Log)
// Ruta: /hr/activity-log
// Timeline CRUD pe entitatile HR
// Filtrare: entitate + actiune + angajat
// Paginare: 10/20/50
// ──────────────────────────────────────────────────────────

import * as React from "react";
import { format, parseISO } from "date-fns";
import { ro, enGB } from "date-fns/locale";
import {
  Plus,
  Pencil,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Calendar,
  Wallet,
  FileText,
  CalendarDays,
  CheckCircle2,
  XCircle,
  X,
  Star,
  GraduationCap,
  UserPlus,
  HelpCircle,
} from "lucide-react";
import { useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useMobile } from "@/hooks/use-mobile";

import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Employee } from "@/modules/hr/types";
import {
  loadHrAuditLog,
  type HrAuditEntry,
  type HrAuditAction,
  type HrAuditEntity,
} from "@/hooks/use-hr-audit-log";

// ── Config vizual ───────────────────────────────────────────

const ACTION_CONFIG: Record<
  HrAuditAction,
  { color: string; icon: React.ReactNode; labelKey: string }
> = {
  create: {
    color:
      "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200",
    icon: <Plus className="h-3.5 w-3.5" />,
    labelKey: "hrAuditLog.actions.create",
  },
  update: {
    color:
      "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200",
    icon: <Pencil className="h-3.5 w-3.5" />,
    labelKey: "hrAuditLog.actions.update",
  },
  delete: {
    color:
      "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200",
    icon: <Trash2 className="h-3.5 w-3.5" />,
    labelKey: "hrAuditLog.actions.delete",
  },
  approve: {
    color:
      "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-200",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    labelKey: "hrAuditLog.actions.approve",
  },
  reject: {
    color:
      "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-200",
    icon: <XCircle className="h-3.5 w-3.5" />,
    labelKey: "hrAuditLog.actions.reject",
  },
};

const ENTITY_CONFIG: Record<
  HrAuditEntity,
  { icon: React.ReactNode; labelKey: string }
> = {
  employee: {
    icon: <User className="h-4 w-4" />,
    labelKey: "hrAuditLog.entities.employee",
  },
  leave: {
    icon: <Calendar className="h-4 w-4" />,
    labelKey: "hrAuditLog.entities.leave",
  },
  bonus: {
    icon: <Wallet className="h-4 w-4" />,
    labelKey: "hrAuditLog.entities.bonus",
  },
  document: {
    icon: <FileText className="h-4 w-4" />,
    labelKey: "hrAuditLog.entities.document",
  },
  attendance: {
    icon: <CalendarDays className="h-4 w-4" />,
    labelKey: "hrAuditLog.entities.attendance",
  },
  evaluation: {
    icon: <Star className="h-4 w-4" />,
    labelKey: "hrAuditLog.entities.evaluation",
  },
  training: {
    icon: <GraduationCap className="h-4 w-4" />,
    labelKey: "hrAuditLog.entities.training",
  },
  candidate: {
    icon: <UserPlus className="h-4 w-4" />,
    labelKey: "hrAuditLog.entities.candidate",
  },
};

// ── Card intrare ────────────────────────────────────────────

function HrAuditEntryCard({
  entry,
  isMobile,
}: {
  entry: HrAuditEntry;
  isMobile: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = React.useState(false);
  const action = ACTION_CONFIG[entry.action] ?? {
    icon: <HelpCircle className="h-3 w-3" />,
    color: "border-gray-400 text-gray-600",
    labelKey: "hrAuditLog.actions.update",
  };
  const entity = ENTITY_CONFIG[entry.entity] ?? {
    icon: <HelpCircle className="h-4 w-4" />,
    labelKey: "hrAuditLog.entities.employee",
  };
  const dateLocale = i18n.language === "en" ? enGB : ro;

  const formattedTime = (() => {
    try {
      return format(
        parseISO(entry.timestamp),
        isMobile ? "dd.MM.yy HH:mm" : "dd MMM yyyy, HH:mm:ss",
        { locale: dateLocale },
      );
    } catch {
      return entry.timestamp;
    }
  })();

  const dotColor =
    entry.action === "create"
      ? "border-green-400 text-green-600"
      : entry.action === "update"
        ? "border-blue-400 text-blue-600"
        : entry.action === "approve"
          ? "border-emerald-400 text-emerald-600"
          : entry.action === "reject"
            ? "border-orange-400 text-orange-600"
            : "border-red-400 text-red-600";

  return (
    <div className="flex gap-3 min-w-0">
      <div className="flex flex-col items-center shrink-0">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full border-2 bg-background shrink-0",
            dotColor,
          )}
        >
          {entity.icon}
        </div>
        <div className="mt-1 w-px flex-1 bg-border" />
      </div>

      <Card className="mb-3 flex-1 min-w-0">
        <CardContent className="pt-3 pb-3 px-3 min-w-0">
          <div className="flex flex-wrap items-start gap-2 min-w-0">
            <Badge
              variant="outline"
              className={cn(
                "flex items-center gap-1 shrink-0 text-xs",
                action.color,
              )}
            >
              {action.icon}
              {t(action.labelKey)}
            </Badge>

            <span className="text-sm font-medium truncate min-w-0">
              {t(entity.labelKey)}:&nbsp;
              <span className="text-primary">{entry.entityLabel}</span>
            </span>

            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              <Clock className="h-3 w-3" />
              {formattedTime}
            </span>
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-medium">{entry.user}</span>
            {entry.details && <> — {entry.details}</>}
          </p>

          {(entry.oldValue || entry.newValue) && (
            <div className="mt-2">
              <button
                className="text-xs text-primary hover:underline"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded
                  ? t("hrAuditLog.hideDetails")
                  : t("hrAuditLog.showDetails")}
              </button>
              {expanded && (
                <div
                  className={cn(
                    "mt-2 grid gap-2 text-xs",
                    !isMobile && "grid-cols-2",
                  )}
                >
                  {entry.oldValue && (
                    <div className="rounded border bg-muted/30 p-2 min-w-0">
                      <p className="font-medium text-muted-foreground mb-1">
                        {t("hrAuditLog.before")}
                      </p>
                      <pre className="whitespace-pre-wrap break-all font-mono text-[10px]">
                        {JSON.stringify(entry.oldValue, null, 2)}
                      </pre>
                    </div>
                  )}
                  {entry.newValue && (
                    <div className="rounded border bg-muted/30 p-2 min-w-0">
                      <p className="font-medium text-muted-foreground mb-1">
                        {t("hrAuditLog.after")}
                      </p>
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

// ── Pagina principala ───────────────────────────────────────

const PAGE_SIZES = [10, 20, 50] as const;

export default function ActivityLogHRPage() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const isMobile = useMobile(640);

  const topNavLinks = [
    { title: t("hr.nav.employees"), href: "/hr/employees" },
    { title: t("hr.nav.leaves"), href: "/hr/leaves" },
    { title: t("hr.nav.payroll"), href: "/hr/payroll" },
    { title: t("hr.nav.attendance"), href: "/hr/attendance" },
    { title: t("hr.nav.activityLog"), href: "/hr/activity-log" },
  ].map((link) => ({
    ...link,
    isActive:
      pathname === link.href ||
      (link.href === "/hr/employees" && pathname === "/hr"),
  }));

  const employees = React.useMemo(
    () => getCollection<Employee>(STORAGE_KEYS.employees),
    [],
  );

  const [filterEntity, setFilterEntity] = React.useState<HrAuditEntity | "all">(
    "all",
  );
  const [filterAction, setFilterAction] = React.useState<HrAuditAction | "all">(
    "all",
  );
  const [filterEmployee, setFilterEmployee] = React.useState<string>("all");
  const [pageSize, setPageSize] = React.useState<number>(20);
  const [page, setPage] = React.useState(1);

  const [entries, setEntries] = React.useState<HrAuditEntry[]>([]);
  React.useEffect(() => {
    setEntries(loadHrAuditLog());
  }, []);

  const filtered = React.useMemo(() => {
    return entries.filter((e) => {
      if (filterEntity !== "all" && e.entity !== filterEntity) return false;
      if (filterAction !== "all" && e.action !== filterAction) return false;
      if (filterEmployee !== "all") {
        const empName = employees.find(
          (emp) => emp.id === filterEmployee,
        )?.name;
        if (!empName) return false;
        if (e.entityId !== filterEmployee && !e.entityLabel.includes(empName))
          return false;
      }
      return true;
    });
  }, [entries, filterEntity, filterAction, filterEmployee, employees]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const hasFilters =
    filterEntity !== "all" ||
    filterAction !== "all" ||
    filterEmployee !== "all";

  const resetFilters = () => {
    setFilterEntity("all");
    setFilterAction("all");
    setFilterEmployee("all");
    setPage(1);
  };

  React.useEffect(() => {
    setPage(1);
  }, [filterEntity, filterAction, filterEmployee, pageSize]);

  const entityOptions = React.useMemo<
    { value: HrAuditEntity | "all"; label: string }[]
  >(
    () => [
      { value: "all", label: t("hrAuditLog.allEntities") },
      { value: "employee", label: t("hrAuditLog.entities.employee") },
      { value: "leave", label: t("hrAuditLog.entities.leave") },
      { value: "bonus", label: t("hrAuditLog.entities.bonus") },
      { value: "document", label: t("hrAuditLog.entities.document") },
      { value: "attendance", label: t("hrAuditLog.entities.attendance") },
      { value: "evaluation", label: t("hrAuditLog.entities.evaluation") },
      { value: "training", label: t("hrAuditLog.entities.training") },
      { value: "candidate", label: t("hrAuditLog.entities.candidate") },
    ],
    [t],
  );

  const actionOptions = React.useMemo<
    { value: HrAuditAction | "all"; label: string }[]
  >(
    () => [
      { value: "all", label: t("hrAuditLog.allActions") },
      { value: "create", label: t("hrAuditLog.actions.create") },
      { value: "update", label: t("hrAuditLog.actions.update") },
      { value: "delete", label: t("hrAuditLog.actions.delete") },
      { value: "approve", label: t("hrAuditLog.actions.approve") },
      { value: "reject", label: t("hrAuditLog.actions.reject") },
    ],
    [t],
  );

  return (
    <>
      <Header>
        <TopNav links={topNavLinks} />
      </Header>

      <Main>
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{t("hrAuditLog.title")}</h1>
          <p className="text-muted-foreground">{t("hrAuditLog.subtitle")}</p>
        </div>

        {/* Toolbar filtre */}
        <div
          className={cn(
            "mb-6 flex gap-2",
            isMobile ? "flex-col" : "flex-wrap items-center",
          )}
        >
          <div className="flex items-center gap-1 shrink-0 text-sm text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            <span>{t("hrAuditLog.filters")}</span>
          </div>

          <Select
            value={filterEntity}
            onValueChange={(v) => setFilterEntity(v as HrAuditEntity | "all")}
          >
            <SelectTrigger className={cn(isMobile ? "w-full" : "w-[190px]")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {entityOptions.map((e) => (
                <SelectItem key={e.value} value={e.value}>
                  {e.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filterAction}
            onValueChange={(v) => setFilterAction(v as HrAuditAction | "all")}
          >
            <SelectTrigger className={cn(isMobile ? "w-full" : "w-[170px]")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {actionOptions.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterEmployee} onValueChange={setFilterEmployee}>
            <SelectTrigger className={cn(isMobile ? "w-full" : "w-[180px]")}>
              <SelectValue placeholder={t("hrAuditLog.allEmployees")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("hrAuditLog.allEmployees")}
              </SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(pageSize)}
            onValueChange={(v) => setPageSize(Number(v))}
          >
            <SelectTrigger className={cn(isMobile ? "w-full" : "w-[110px]")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s} {t("hrAuditLog.perPage")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className={cn(isMobile && "w-full")}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              {t("hrAuditLog.resetFilters")}
            </Button>
          )}

          <span
            className={cn(
              "text-xs text-muted-foreground",
              !isMobile && "ml-auto",
            )}
          >
            {t("hrAuditLog.entries", { count: filtered.length })}
          </span>
        </div>

        {/* Timeline */}
        {paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <Clock className="h-10 w-10 opacity-20" />
            <p className="text-sm">{t("hrAuditLog.noActivity")}</p>
          </div>
        ) : (
          <div className="min-w-0">
            {paginated.map((entry) => (
              <HrAuditEntryCard
                key={entry.id}
                entry={entry}
                isMobile={isMobile}
              />
            ))}
          </div>
        )}

        {/* Paginare */}
        {totalPages > 1 && (
          <div
            className={cn(
              "mt-4 flex items-center gap-2",
              isMobile ? "justify-between" : "justify-center",
            )}
          >
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              {!isMobile && t("hrAuditLog.previous")}
            </Button>
            <span className="text-sm text-muted-foreground">
              {t("hrAuditLog.page", { page, total: totalPages })}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {!isMobile && t("hrAuditLog.next")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </Main>
    </>
  );
}
