// C20 — Onboarding Checklist
// Pagina de gestionare a procesului de onboarding pentru angajati noi.
// Template pasi predefinit: contract, cont, training siguranta, echipament,
// prezentare echipa, acces sisteme. Auto-generare checklist pentru angajati
// care nu au unul. Alerta dupa 14 zile daca necomplet.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { differenceInCalendarDays, parseISO, startOfToday } from "date-fns";
import { toast } from "sonner";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

import { STORAGE_KEYS } from "@/data/mock-data";
import { formatDate } from "@/utils/format";
import { cn } from "@/lib/utils";
import { useHrAuditLog } from "@/hooks/use-hr-audit-log";
import { useSyncedCollection } from "@/hooks/use-synced-collection";
import {
  ONBOARDING_STEP_KEYS,
  type Employee,
  type OnboardingChecklist,
  type OnboardingStep,
  type OnboardingStepKey,
} from "@/modules/hr/types";

const OVERDUE_THRESHOLD_DAYS = 14;

// ── Helpers ────────────────────────────────────────────────

function createTemplateSteps(): OnboardingStep[] {
  return ONBOARDING_STEP_KEYS.map((key) => ({ key, completed: false }));
}

function buildChecklist(employee: Employee): OnboardingChecklist {
  return {
    id: `onb-${employee.id}`,
    employeeId: employee.id,
    startedAt: employee.hireDate,
    steps: createTemplateSteps(),
    status: "in_progress",
  };
}

function computeProgress(steps: OnboardingStep[]): { done: number; total: number; pct: number } {
  const total = steps.length;
  const done = steps.filter((s) => s.completed).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return { done, total, pct };
}

function isOverdue(checklist: OnboardingChecklist, today: Date): boolean {
  if (checklist.status === "completed") return false;
  const started = parseISO(checklist.startedAt);
  if (isNaN(started.getTime())) return false;
  return differenceInCalendarDays(today, started) > OVERDUE_THRESHOLD_DAYS;
}

function syncChecklistsWithEmployees(
  existing: OnboardingChecklist[],
  employees: Employee[],
): OnboardingChecklist[] {
  const byEmployeeId = new Map(existing.map((c) => [c.employeeId, c]));
  for (const emp of employees) {
    if (!byEmployeeId.has(emp.id)) {
      byEmployeeId.set(emp.id, buildChecklist(emp));
    }
  }
  return Array.from(byEmployeeId.values());
}

// ── Page ───────────────────────────────────────────────────

export default function OnboardingPage() {
  const { t } = useTranslation();
  const { log } = useHrAuditLog();

  const { items: employees, refresh: refreshEmployees } =
    useSyncedCollection<Employee>(STORAGE_KEYS.employees);
  const { items: checklists, save: saveChecklists } =
    useSyncedCollection<OnboardingChecklist>(STORAGE_KEYS.onboarding);
  const [dialogChecklistId, setDialogChecklistId] = useState<string | null>(null);

  // Seed — cand lista de angajati se schimba, creeaza checklist-uri lipsa.
  useEffect(() => {
    const synced = syncChecklistsWithEmployees(checklists, employees);
    if (synced.length !== checklists.length) {
      saveChecklists(synced);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees]);

  const today = startOfToday();

  const rows = useMemo(() => {
    return checklists.map((c) => {
      const emp = employees.find((e) => e.id === c.employeeId);
      const progress = computeProgress(c.steps);
      return {
        checklist: c,
        employeeName: emp?.name ?? c.employeeId,
        employeeDepartment: emp?.department ?? "",
        progress,
        overdue: isOverdue(c, today),
      };
    });
  }, [checklists, employees, today]);

  const overdueCount = rows.filter((r) => r.overdue).length;
  const inProgressCount = rows.filter((r) => r.checklist.status === "in_progress").length;
  const completedCount = rows.filter((r) => r.checklist.status === "completed").length;

  const updateChecklist = useCallback(
    (updated: OnboardingChecklist) => {
      saveChecklists(checklists.map((c) => (c.id === updated.id ? updated : c)));
    },
    [checklists, saveChecklists],
  );

  const activeChecklist = useMemo(
    () => checklists.find((c) => c.id === dialogChecklistId) ?? null,
    [checklists, dialogChecklistId],
  );
  const activeEmployee = useMemo(
    () => (activeChecklist ? employees.find((e) => e.id === activeChecklist.employeeId) ?? null : null),
    [activeChecklist, employees],
  );

  const handleStepChange = useCallback(
    (stepKey: OnboardingStepKey, patch: Partial<OnboardingStep>) => {
      if (!activeChecklist) return;
      const todayISO = new Date().toISOString().slice(0, 10);
      const steps = activeChecklist.steps.map((s) =>
        s.key === stepKey
          ? {
              ...s,
              ...patch,
              completedAt: patch.completed === false
                ? undefined
                : patch.completed
                  ? (s.completedAt ?? todayISO)
                  : s.completedAt,
            }
          : s,
      );
      const allDone = steps.every((s) => s.completed);
      const updated: OnboardingChecklist = {
        ...activeChecklist,
        steps,
        status: allDone ? "completed" : "in_progress",
        completedAt: allDone ? (activeChecklist.completedAt ?? todayISO) : undefined,
      };
      updateChecklist(updated);

      if (allDone && activeChecklist.status !== "completed") {
        log({
          action: "update",
          entity: "onboarding",
          entityId: updated.id,
          entityLabel: activeEmployee?.name ?? updated.employeeId,
          details: t("onboarding.toast.completed"),
        });
        toast.success(t("onboarding.toast.completed"));
      }
    },
    [activeChecklist, activeEmployee, log, t, updateChecklist],
  );

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("onboarding.title")}</h1>
      </Header>

      <Main className="space-y-6">
        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard
            icon={<Clock className="h-4 w-4 text-blue-500" />}
            label={t("onboarding.kpi.inProgress")}
            value={inProgressCount}
          />
          <KpiCard
            icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
            label={t("onboarding.kpi.completed")}
            value={completedCount}
          />
          <KpiCard
            icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
            label={t("onboarding.kpi.overdue")}
            value={overdueCount}
            highlight={overdueCount > 0}
          />
        </div>

        {/* Tabel */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-semibold">{t("onboarding.listTitle")}</CardTitle>
              <p className="text-xs text-muted-foreground">{t("onboarding.listSubtitle")}</p>
            </div>
            <Button variant="outline" size="sm" onClick={refreshEmployees}>
              {t("onboarding.refresh")}
            </Button>
          </CardHeader>
          <CardContent>
            {/* Desktop */}
            <div className="hidden md:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("onboarding.columns.employee")}</TableHead>
                    <TableHead>{t("onboarding.columns.department")}</TableHead>
                    <TableHead>{t("onboarding.columns.startDate")}</TableHead>
                    <TableHead className="w-[220px]">{t("onboarding.columns.progress")}</TableHead>
                    <TableHead>{t("onboarding.columns.status")}</TableHead>
                    <TableHead className="text-right">{t("onboarding.columns.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        {t("onboarding.empty")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.checklist.id}>
                        <TableCell className="font-medium">{row.employeeName}</TableCell>
                        <TableCell className="text-muted-foreground">{row.employeeDepartment}</TableCell>
                        <TableCell>{formatDate(row.checklist.startedAt)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={row.progress.pct} className="h-2 w-24" />
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {row.progress.done}/{row.progress.total}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge checklist={row.checklist} overdue={row.overdue} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => setDialogChecklistId(row.checklist.id)}>
                            {t("onboarding.actions.open")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile */}
            <div className="flex flex-col gap-3 md:hidden">
              {rows.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t("onboarding.empty")}</p>
              ) : (
                rows.map((row) => (
                  <div key={row.checklist.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{row.employeeName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {row.employeeDepartment} · {formatDate(row.checklist.startedAt)}
                        </p>
                      </div>
                      <StatusBadge checklist={row.checklist} overdue={row.overdue} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={row.progress.pct} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {row.progress.done}/{row.progress.total}
                      </span>
                    </div>
                    <Button size="sm" variant="outline" className="w-full" onClick={() => setDialogChecklistId(row.checklist.id)}>
                      {t("onboarding.actions.open")}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </Main>

      <StepsDialog
        checklist={activeChecklist}
        employee={activeEmployee}
        open={!!activeChecklist}
        onOpenChange={(v) => { if (!v) setDialogChecklistId(null); }}
        onStepChange={handleStepChange}
      />
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────

function KpiCard({
  icon, label, value, highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <Card className={cn(highlight && "border-red-500/40")}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <p className={cn("text-2xl font-bold tabular-nums", highlight && "text-red-500")}>{value}</p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({
  checklist,
  overdue,
}: {
  checklist: OnboardingChecklist;
  overdue: boolean;
}) {
  const { t } = useTranslation();
  if (checklist.status === "completed") {
    return (
      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 border">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        {t("onboarding.status.completed")}
      </Badge>
    );
  }
  if (overdue) {
    return (
      <Badge variant="destructive">
        <AlertTriangle className="h-3 w-3 mr-1" />
        {t("onboarding.status.overdue")}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      <Clock className="h-3 w-3 mr-1" />
      {t("onboarding.status.inProgress")}
    </Badge>
  );
}

function StepsDialog({
  checklist,
  employee,
  open,
  onOpenChange,
  onStepChange,
}: {
  checklist: OnboardingChecklist | null;
  employee: Employee | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onStepChange: (stepKey: OnboardingStepKey, patch: Partial<OnboardingStep>) => void;
}) {
  const { t } = useTranslation();
  if (!checklist) return null;

  const { done, total } = computeProgress(checklist.steps);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("onboarding.dialog.title", { name: employee?.name ?? checklist.employeeId })}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <p className="text-sm text-muted-foreground">
            {t("onboarding.dialog.progress", { done, total })}
          </p>
          <div className="space-y-3">
            {checklist.steps.map((step) => (
              <StepRow
                key={step.key}
                step={step}
                onChange={(patch) => onStepChange(step.key, patch)}
              />
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>{t("onboarding.dialog.close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepRow({
  step,
  onChange,
}: {
  step: OnboardingStep;
  onChange: (patch: Partial<OnboardingStep>) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex items-start gap-3">
        <Checkbox
          id={`step-${step.key}`}
          checked={step.completed}
          onCheckedChange={(v) => onChange({ completed: v === true })}
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <Label htmlFor={`step-${step.key}`} className="font-medium">
            {t(`onboarding.steps.${step.key}`)}
          </Label>
          {step.completed && step.completedAt && (
            <p className="text-xs text-muted-foreground pt-0.5">
              {t("onboarding.steps.completedOn", { date: formatDate(step.completedAt) })}
            </p>
          )}
        </div>
      </div>
      {step.completed && (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("onboarding.steps.completedAt")}</Label>
            <Input
              type="date"
              value={step.completedAt ?? ""}
              onChange={(e) => onChange({ completedAt: e.target.value || undefined })}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">{t("onboarding.steps.note")}</Label>
            <Textarea
              value={step.note ?? ""}
              onChange={(e) => onChange({ note: e.target.value })}
              rows={2}
              placeholder={t("onboarding.steps.notePlaceholder")}
            />
          </div>
        </div>
      )}
    </div>
  );
}
