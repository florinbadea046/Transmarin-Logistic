import * as React from "react";
import { format, isSameMonth, addDays, differenceInCalendarDays } from "date-fns";
import { ro } from "date-fns/locale";
import { enGB } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { DayButton } from "react-day-picker";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getCollection, removeItem, updateItem } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { LeaveRequest, Employee } from "@/modules/hr/types";
import { formatDate } from "@/utils/format";
import LeaveDialog from "@/modules/hr/components/leave-dialog";
import { toast } from "sonner";
import { useAuditLog } from "@/hooks/use-audit-log";

// ── Constants ────────────────────────────────────────────────
const MAX_VISIBLE_NAMES = 2;
const MAX_VISIBLE_DOTS = 4;
const UNKNOWN_EMPLOYEE = "—";
const UNKNOWN_DEPARTMENT = "—";

const LEAVE_CONFIG: Record<
  LeaveRequest["type"],
  { bg: string }
> = {
  annual: { bg: "bg-blue-500" },
  sick: { bg: "bg-red-500" },
  other: { bg: "bg-yellow-400" },
  unpaid: { bg: "bg-gray-400" },
};

// ── Types ────────────────────────────────────────────────────
type DayLeave = LeaveRequest & { employeeName: string; department: string };

// ── LeaveTypePill ────────────────────────────────────────────
function LeaveTypePill({
  leave,
  mode,
}: {
  leave: DayLeave;
  mode: "name" | "dot";
}) {
  const cfg = LEAVE_CONFIG[leave.type];
  if (mode === "dot") {
    return <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.bg)} />;
  }
  return (
    <div
      className={cn(
        "text-[10px] px-1 rounded truncate text-white leading-[14px] w-full",
        cfg.bg,
      )}
    >
      {leave.employeeName.split(" ")[0]}
    </div>
  );
}

// ── Component ────────────────────────────────────────────────
export default function LeaveCalendar() {
  const { t, i18n } = useTranslation();
  const { log } = useAuditLog();
  const locale = i18n.language.startsWith("en") ? enGB : ro;
  const calendarFormatters = React.useMemo(() => ({
    formatCaption: (date: Date) =>
      format(date, "MMMM yyyy", { locale }).replace(/^\w/, (c) => c.toUpperCase()),
  }), [locale]);

  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null);
  const [editLeave, setEditLeave] = React.useState<DayLeave | null>(null);
  const [deleteLeave, setDeleteLeave] = React.useState<DayLeave | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const refresh = React.useCallback(() => {
    setRefreshKey((k) => k + 1);
    setSelectedDay(null);
  }, []);

  const employees = React.useMemo(
    () => getCollection<Employee>(STORAGE_KEYS.employees),
    [],
  );

  const leaves = React.useMemo(
    () =>
      getCollection<LeaveRequest>(STORAGE_KEYS.leaveRequests).filter(
        (l) => l.status === "approved",
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshKey],
  );

  const employeeMap = React.useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach((e) => map.set(e.id, e));
    return map;
  }, [employees]);

  const leavesPerDay = React.useMemo(() => {
    const map = new Map<string, DayLeave[]>();
    leaves.forEach((l) => {
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
      const diffDays = differenceInCalendarDays(end, start);
      for (let i = 0; i <= diffDays; i++) {
        const d = addDays(start, i);
        if (!isSameMonth(d, currentDate)) continue;
        const key = format(d, "yyyy-MM-dd");
        const emp = employeeMap.get(l.employeeId);
        const entry: DayLeave = {
          ...l,
          employeeName: emp?.name ?? UNKNOWN_EMPLOYEE,
          department: emp?.department ?? UNKNOWN_DEPARTMENT,
        };
        const existing = map.get(key) ?? [];
        map.set(key, [...existing, entry]);
      }
    });
    return map;
  }, [leaves, employeeMap, currentDate]);

  const leavesPerDayRef = React.useRef(leavesPerDay);
  leavesPerDayRef.current = leavesPerDay;

  const getLeavesForDay = React.useCallback(
    (date: Date): DayLeave[] =>
      leavesPerDayRef.current.get(format(date, "yyyy-MM-dd")) ?? [],
    [],
  );

  const deptSummary = React.useMemo(() => {
    const summary: Record<string, number> = {};
    leavesPerDay.forEach((dayLeaves) => {
      dayLeaves.forEach((leave) => {
        summary[leave.department] = (summary[leave.department] || 0) + 1;
      });
    });
    return Object.entries(summary).sort((a, b) => b[1] - a[1]);
  }, [leavesPerDay]);

  const selectedDayLeaves = selectedDay ? getLeavesForDay(selectedDay) : [];
  const hasAnyLeave = leavesPerDay.size > 0;

  const CustomDayButton = React.useCallback(
    ({ day, modifiers, className }: React.ComponentProps<typeof DayButton>) => {
      const dayLeaves = getLeavesForDay(day.date);
      return (
        <button
          className={cn(
            "relative flex flex-col items-start w-full h-10 sm:h-16 p-0.5 sm:p-1 rounded-md border hover:bg-accent transition-colors text-left",
            modifiers.today ? "border-primary" : "border-border",
            className,
          )}
          onClick={() => setSelectedDay(day.date)}
        >
          <span
            className={cn(
              "text-[11px] sm:text-xs font-medium w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full mb-0.5",
              modifiers.today && "bg-primary text-primary-foreground",
            )}
          >
            {format(day.date, "d")}
          </span>

          {/* Mobile: puncte colorate */}
          <div className="flex sm:hidden flex-wrap gap-0.5 px-0.5">
            {dayLeaves.slice(0, MAX_VISIBLE_DOTS).map((leave) => (
              <LeaveTypePill key={leave.id} leave={leave} mode="dot" />
            ))}
            {dayLeaves.length > MAX_VISIBLE_DOTS && (
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground shrink-0" />
            )}
          </div>

          {/* Desktop: nume */}
          <div className="hidden sm:flex flex-col gap-0.5 w-full">
            {dayLeaves.slice(0, MAX_VISIBLE_NAMES).map((leave) => (
              <LeaveTypePill key={leave.id} leave={leave} mode="name" />
            ))}
            {dayLeaves.length > MAX_VISIBLE_NAMES && (
              <span className="text-[10px] text-muted-foreground px-1">
                +{dayLeaves.length - MAX_VISIBLE_NAMES}
              </span>
            )}
          </div>
        </button>
      );
    },
    [getLeavesForDay],
  );

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex-1 min-w-0">
          <Card>
            <CardContent className="p-1 sm:p-3">
              <Calendar
                mode="single"
                month={currentDate}
                onMonthChange={setCurrentDate}
                locale={locale}
                weekStartsOn={1}
                showOutsideDays={false}
                className="w-full [--cell-size:theme(spacing.9)] sm:[--cell-size:theme(spacing.16)]"
                formatters={calendarFormatters}
                classNames={{
                  month: "flex w-full flex-col gap-2",
                  weekday: "flex-1 min-w-0 text-center text-xs text-muted-foreground font-medium",
                  week: "flex w-full mt-1",
                  day: "relative flex-1 min-w-0 p-0",
                  day_button: "w-full",
                }}
                components={{ DayButton: CustomDayButton }}
              />

              {!hasAnyLeave && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {t("leaves.calendar.noLeavesMonth")}
                </p>
              )}

              <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t">
                {Object.entries(LEAVE_CONFIG).map(([type, cfg]) => (
                  <div key={type} className="flex items-center gap-1.5">
                    <div className={cn("w-3 h-3 rounded-sm", cfg.bg)} />
                    <span className="text-xs text-muted-foreground">{t(`leaves.calendar.types.${type}`)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="w-full lg:w-60 lg:shrink-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t("leaves.calendar.deptSummary")}</CardTitle>
              <p className="text-xs text-muted-foreground capitalize">
                {format(currentDate, "MMMM yyyy", { locale })}
              </p>
            </CardHeader>
            <CardContent>
              {deptSummary.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("leaves.calendar.noLeaves")}
                </p>
              ) : (
                <div className="space-y-2">
                  {deptSummary.map(([dept, total]) => (
                    <div key={dept} className="flex items-center justify-between">
                      <span className="text-sm">{dept}</span>
                      <Badge variant="secondary">{t("leaves.calendar.days", { count: total })}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog detalii zi */}
      <Dialog
        open={!!selectedDay}
        onOpenChange={(open) => !open && setSelectedDay(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDay && format(selectedDay, "d MMMM yyyy", { locale })}
            </DialogTitle>
            {selectedDayLeaves.length > 0 && (
              <DialogDescription>
                {t("leaves.calendar.onLeave", { count: selectedDayLeaves.length })}
              </DialogDescription>
            )}
          </DialogHeader>
          {selectedDayLeaves.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("leaves.calendar.noLeaveDay")}
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {selectedDayLeaves.map((leave) => (
                <div key={leave.id} className="flex gap-3 p-2 rounded-md border">
                  <div
                    className={cn(
                      "w-1 rounded-full self-stretch shrink-0",
                      LEAVE_CONFIG[leave.type].bg,
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{leave.employeeName}</p>
                    <p className="text-xs text-muted-foreground">{leave.department}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t(`leaves.calendar.types.${leave.type}`)} ·{" "}
                      {formatDate(leave.startDate)} –{" "}
                      {formatDate(leave.endDate)} · {t("leaves.calendar.days", { count: leave.days })}
                    </p>
                    {leave.reason && (
                      <p className="text-xs text-muted-foreground italic">
                        {leave.reason}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={t("leaves.calendar.editLeave")}
                      onClick={() => {
                        setSelectedDay(null);
                        setEditLeave(leave);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      aria-label={t("leaves.calendar.deleteLeave")}
                      onClick={() => {
                        setSelectedDay(null);
                        setDeleteLeave(leave);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog editare */}
      {editLeave && (
        <LeaveDialog
          mode="edit"
          leave={editLeave}
          open={!!editLeave}
          onOpenChange={(open) => !open && setEditLeave(null)}
          onEdit={(updated) => {
            updateItem<LeaveRequest>(
              STORAGE_KEYS.leaveRequests,
              (lr) => lr.id === updated.id,
              () => updated,
            );
            log({
              action: "update",
              entity: "leaveRequest",
              entityId: updated.id,
              entityLabel: editLeave.employeeName,
              detailKey: "activityLog.details.leaveRequestUpdated",
            });
            setEditLeave(null);
            refresh();
            toast.success(t("leaves.calendar.updateSuccess"));
          }}
        />
      )}

      {/* Dialog confirmare stergere */}
      <AlertDialog
        open={!!deleteLeave}
        onOpenChange={(open) => !open && setDeleteLeave(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("leaves.calendar.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("leaves.calendar.confirmDeleteDesc")}{" "}
              <strong className="text-foreground">{deleteLeave?.employeeName}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("leaves.calendar.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={() => {
                if (!deleteLeave) return;
                removeItem<LeaveRequest>(
                  STORAGE_KEYS.leaveRequests,
                  (lr) => lr.id === deleteLeave.id,
                );
                log({
                  action: "delete",
                  entity: "leaveRequest",
                  entityId: deleteLeave.id,
                  entityLabel: deleteLeave.employeeName,
                  detailKey: "activityLog.details.leaveRequestDeleted",
                });
                setDeleteLeave(null);
                refresh();
                toast.success(t("leaves.calendar.deleteSuccess"));
              }}
            >
              {t("leaves.calendar.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
