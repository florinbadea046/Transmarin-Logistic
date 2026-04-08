// ──────────────────────────────────────────────────────────
// B13. Audit Log Contabilitate
// Ruta: /accounting/activity-log
// Timeline CRUD pe facturi, furnizori, plati, buget
// Filtrare: entitate + actiune. Paginare 10/20/50
// Hook useAccountingAuditLog() integrat la fiecare operatie
// Persistare STORAGE_KEYS.accounting_audit_log
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
  FileText,
  Building2,
  CreditCard,
  PiggyBank,
  RefreshCcw,
  X,
} from "lucide-react";
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

import {
  loadAccountingAuditLog,
  type AccountingAuditEntry,
  type AccountingAuditAction,
  type AccountingAuditEntity,
} from "@/hooks/use-accounting-audit-log";

// ── Nav links ───────────────────────────────────────────────

const topNavLinks = [
  { title: "Facturi", href: "/accounting/invoices", isActive: false },
  { title: "Furnizori", href: "/accounting/suppliers", isActive: false },
  { title: "Buget", href: "/accounting/budget", isActive: false },
  { title: "Audit Log", href: "/accounting/activity-log", isActive: true },
];

const PAGE_SIZES = [10, 20, 50];

// ── Config vizual ───────────────────────────────────────────

const ACTION_CONFIG: Record<
  AccountingAuditAction,
  { color: string; icon: React.ReactNode; labelKey: string }
> = {
  create: {
    color:
      "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200",
    icon: <Plus className="h-3.5 w-3.5" />,
    labelKey: "accountingAuditLog.actions.create",
  },
  update: {
    color:
      "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200",
    icon: <Pencil className="h-3.5 w-3.5" />,
    labelKey: "accountingAuditLog.actions.update",
  },
  delete: {
    color:
      "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200",
    icon: <Trash2 className="h-3.5 w-3.5" />,
    labelKey: "accountingAuditLog.actions.delete",
  },
  pay: {
    color:
      "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-200",
    icon: <CreditCard className="h-3.5 w-3.5" />,
    labelKey: "accountingAuditLog.actions.pay",
  },
};

const ENTITY_CONFIG: Record<
  AccountingAuditEntity,
  { icon: React.ReactNode; labelKey: string }
> = {
  invoice: {
    icon: <FileText className="h-4 w-4" />,
    labelKey: "accountingAuditLog.entities.invoice",
  },
  supplier: {
    icon: <Building2 className="h-4 w-4" />,
    labelKey: "accountingAuditLog.entities.supplier",
  },
  payment: {
    icon: <CreditCard className="h-4 w-4" />,
    labelKey: "accountingAuditLog.entities.payment",
  },
  budget: {
    icon: <PiggyBank className="h-4 w-4" />,
    labelKey: "accountingAuditLog.entities.budget",
  },
  recurringExpense: {
    icon: <RefreshCcw className="h-4 w-4" />,
    labelKey: "accountingAuditLog.entities.recurringExpense",
  },
};

// ── Card intrare ────────────────────────────────────────────

function AccountingAuditEntryCard({
  entry,
  isMobile,
}: {
  entry: AccountingAuditEntry;
  isMobile: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = React.useState(false);
  const action = ACTION_CONFIG[entry.action];
  const entity = ENTITY_CONFIG[entry.entity];
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
        : entry.action === "pay"
          ? "border-emerald-400 text-emerald-600"
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
                  ? t("accountingAuditLog.hideDetails")
                  : t("accountingAuditLog.showDetails")}
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
                        {t("accountingAuditLog.before")}
                      </p>
                      <pre className="whitespace-pre-wrap break-all font-mono text-[10px]">
                        {JSON.stringify(entry.oldValue, null, 2)}
                      </pre>
                    </div>
                  )}
                  {entry.newValue && (
                    <div className="rounded border bg-muted/30 p-2 min-w-0">
                      <p className="font-medium text-muted-foreground mb-1">
                        {t("accountingAuditLog.after")}
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

export default function ActivityLogAccountingPage() {
  const { t } = useTranslation();
  const isMobile = useMobile();

  const [filterEntity, setFilterEntity] = React.useState<AccountingAuditEntity | "all">("all");
  const [filterAction, setFilterAction] = React.useState<AccountingAuditAction | "all">("all");
  const [pageSize, setPageSize] = React.useState<number>(20);
  const [page, setPage] = React.useState(1);
  const [entries, setEntries] = React.useState<AccountingAuditEntry[]>([]);

  React.useEffect(() => {
    setEntries(loadAccountingAuditLog());
  }, []);

  const filtered = React.useMemo(() => {
    return entries.filter((e) => {
      if (filterEntity !== "all" && e.entity !== filterEntity) return false;
      if (filterAction !== "all" && e.action !== filterAction) return false;
      return true;
    });
  }, [entries, filterEntity, filterAction]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const hasFilters = filterEntity !== "all" || filterAction !== "all";

  const resetFilters = () => {
    setFilterEntity("all");
    setFilterAction("all");
    setPage(1);
  };

  React.useEffect(() => {
    setPage(1);
  }, [filterEntity, filterAction, pageSize]);

  const entityOptions: { value: AccountingAuditEntity | "all"; label: string }[] = [
    { value: "all", label: t("accountingAuditLog.allEntities") },
    { value: "invoice", label: t("accountingAuditLog.entities.invoice") },
    { value: "supplier", label: t("accountingAuditLog.entities.supplier") },
    { value: "payment", label: t("accountingAuditLog.entities.payment") },
    { value: "budget", label: t("accountingAuditLog.entities.budget") },
    { value: "recurringExpense", label: t("accountingAuditLog.entities.recurringExpense") },
  ];

  const actionOptions: { value: AccountingAuditAction | "all"; label: string }[] = [
    { value: "all", label: t("accountingAuditLog.allActions") },
    { value: "create", label: t("accountingAuditLog.actions.create") },
    { value: "update", label: t("accountingAuditLog.actions.update") },
    { value: "delete", label: t("accountingAuditLog.actions.delete") },
    { value: "pay", label: t("accountingAuditLog.actions.pay") },
  ];

  return (
    <>
      <Header>
        <TopNav links={topNavLinks} />
      </Header>

      <Main>
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{t("accountingAuditLog.title")}</h1>
          <p className="text-muted-foreground">{t("accountingAuditLog.subtitle")}</p>
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
            <span>{t("accountingAuditLog.filters")}</span>
          </div>

          <Select
            value={filterEntity}
            onValueChange={(v) => setFilterEntity(v as AccountingAuditEntity | "all")}
          >
            <SelectTrigger className={cn(isMobile ? "w-full" : "w-[200px]")}>
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
            onValueChange={(v) => setFilterAction(v as AccountingAuditAction | "all")}
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
                  {s} {t("accountingAuditLog.perPage")}
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
              {t("accountingAuditLog.resetFilters")}
            </Button>
          )}

          <span
            className={cn(
              "text-xs text-muted-foreground",
              !isMobile && "ml-auto",
            )}
          >
            {t("accountingAuditLog.entries", { count: filtered.length })}
          </span>
        </div>

        {/* Timeline */}
        {paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <Clock className="h-10 w-10 opacity-20" />
            <p className="text-sm">{t("accountingAuditLog.noActivity")}</p>
          </div>
        ) : (
          <div className="min-w-0">
            {paginated.map((entry) => (
              <AccountingAuditEntryCard
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
              {!isMobile && t("accountingAuditLog.previous")}
            </Button>
            <span className="text-sm text-muted-foreground">
              {t("accountingAuditLog.page", { page, total: totalPages })}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {!isMobile && t("accountingAuditLog.next")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </Main>
    </>
  );
}
