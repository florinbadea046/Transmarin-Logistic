// ──────────────────────────────────────────────────────────
// Planificare Ture / Schimburi
// Calendar saptamanal cu 3 ture: Dimineata / Dupa-amiaza / Noapte
// ──────────────────────────────────────────────────────────

import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ChevronLeft, ChevronRight, FileDown, CalendarDays } from "lucide-react";

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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { getCollection, setCollection } from "@/utils/local-storage";
import { STORAGE_KEYS, EMPLOYEE_DEPARTMENTS } from "@/data/mock-data";
import { useHrAuditLog } from "@/hooks/use-hr-audit-log";
import type { Employee, Shift, ShiftType } from "@/modules/hr/types";
import { safe } from "./attendance-shared";

// ── Config ────────────────────────────────────────────────
const SHIFT_TYPES = ["morning", "afternoon", "night"] as const;
const DAYS_IN_WEEK = 7;
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

const SHIFT_STYLES: Record<
  ShiftType,
  { cell: string; swatch: string; pdfFill: [number, number, number] }
> = {
  morning: {
    cell: "bg-yellow-400/20 text-yellow-700 dark:text-yellow-300 border border-yellow-500/40 hover:bg-yellow-400/30",
    swatch: "bg-yellow-400",
    pdfFill: [254, 240, 138],
  },
  afternoon: {
    cell: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/40 hover:bg-blue-500/30",
    swatch: "bg-blue-500",
    pdfFill: [191, 219, 254],
  },
  night: {
    cell: "bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-500/40 hover:bg-violet-500/30",
    swatch: "bg-violet-500",
    pdfFill: [221, 214, 254],
  },
};

// Minimal type for jsPDF.lastAutoTable (populat de jspdf-autotable)
type JsPDFWithAutoTable = jsPDF & { lastAutoTable?: { finalY: number } };

// ── Date helpers ──────────────────────────────────────────
function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = copy.getDay(); // 0=Sun, 1=Mon, ... 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() + n);
  return copy;
}

function addDaysISO(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return toISO(addDays(new Date(y, m - 1, d), n));
}

// ── Page ──────────────────────────────────────────────────
export default function ShiftsPage() {
  const { t, i18n } = useTranslation();
  const { log } = useHrAuditLog();
  const locale = i18n.language.startsWith("en") ? "en-GB" : "ro-RO";

  const [department, setDepartment] = React.useState<string>(EMPLOYEE_DEPARTMENTS[0]);
  const [weekStart, setWeekStart] = React.useState<Date>(() => startOfWeek(new Date()));

  const [shifts, setShifts] = React.useState<Shift[]>(() => {
    try {
      return getCollection<Shift>(STORAGE_KEYS.shifts);
    } catch {
      return [];
    }
  });

  // log este re-creat la fiecare render; ținem un ref stabil pentru a-l folosi
  // în callback-uri fără a invalida dep arrays.
  const logRef = React.useRef(log);
  logRef.current = log;

  const employees = React.useMemo(
    () =>
      getCollection<Employee>(STORAGE_KEYS.employees)
        .filter((e) => e.department === department)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [department],
  );

  const days = React.useMemo(() => {
    return Array.from({ length: DAYS_IN_WEEK }, (_, i) => {
      const d = addDays(weekStart, i);
      return {
        date: toISO(d),
        label: t(`hr.shifts.days.${DAY_KEYS[i]}`),
        dayNum: d.getDate(),
        month: d.toLocaleString(locale, { month: "short" }),
      };
    });
  }, [weekStart, t, locale]);

  const shiftMap = React.useMemo(
    () => new Map(shifts.map((s) => [`${s.employeeId}_${s.date}`, s])),
    [shifts],
  );

  const weekRangeLabel = React.useMemo(() => {
    const last = addDays(weekStart, 6);
    const fmt = (d: Date) =>
      d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
    return `${fmt(weekStart)} — ${fmt(last)}`;
  }, [weekStart, locale]);

  // Etichetele pentru popover: stabile cât timp limba nu se schimbă.
  const cellLabels = React.useMemo(
    () => ({
      morning: t("hr.shifts.types.morning"),
      afternoon: t("hr.shifts.types.afternoon"),
      night: t("hr.shifts.types.night"),
      clear: t("hr.shifts.clear"),
      assign: t("hr.shifts.assign"),
      shortMorning: t("hr.shifts.short.morning"),
      shortAfternoon: t("hr.shifts.short.afternoon"),
      shortNight: t("hr.shifts.short.night"),
    }),
    [t, i18n.language],
  );

  // ── Mutation ─────────────────────────────────────────────
  const assignShift = React.useCallback(
    (employeeId: string, date: string, type: ShiftType | null) => {
      const key = `${employeeId}_${date}`;
      const existing = shiftMap.get(key);

      if (type !== null) {
        const prev = shiftMap.get(`${employeeId}_${addDaysISO(date, -1)}`);
        const next = shiftMap.get(`${employeeId}_${addDaysISO(date, 1)}`);
        const violates =
          (type === "morning" && prev?.type === "night") ||
          (type === "night" && next?.type === "morning");
        if (violates) {
          toast.error(t("hr.shifts.validation.blocked"), {
            description: t("hr.shifts.validation.nightThenMorning"),
          });
          return;
        }
      }

      const filtered = shifts.filter(
        (s) => !(s.employeeId === employeeId && s.date === date),
      );
      const nextShifts =
        type === null ? filtered : [...filtered, { id: key, employeeId, date, type }];

      setShifts(nextShifts);
      setCollection(STORAGE_KEYS.shifts, nextShifts);

      const emp = employees.find((e) => e.id === employeeId);
      const empLabel = emp?.name ?? employeeId;
      const action: "create" | "update" | "delete" =
        type === null ? "delete" : existing ? "update" : "create";
      logRef.current({
        action,
        entity: "shift",
        entityId: key,
        entityLabel: empLabel,
        details: `${date}: ${existing?.type ?? "—"} → ${type ?? "—"}`,
      });
    },
    [shifts, shiftMap, employees, t],
  );

  // ── Summary per day per type ─────────────────────────────
  const summary = React.useMemo(() => {
    const employeeIds = new Set(employees.map((e) => e.id));
    return days.map(({ date }) => {
      const counts: Record<ShiftType, number> = { morning: 0, afternoon: 0, night: 0 };
      shifts.forEach((s) => {
        if (s.date === date && employeeIds.has(s.employeeId)) counts[s.type]++;
      });
      return { date, counts };
    });
  }, [shifts, days, employees]);

  // ── PDF export ───────────────────────────────────────────
  const exportPdf = () => {
    if (employees.length === 0) {
      toast.warning(t("hr.shifts.noEmployees"));
      return;
    }
    const doc = new jsPDF({ orientation: "landscape" }) as JsPDFWithAutoTable;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(safe(`${t("hr.shifts.pdf.title")} - ${department}`), 14, 16);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(safe(`${t("hr.shifts.weekOf")}: ${weekRangeLabel}`), 14, 22);
    doc.text(
      safe(`${t("hr.shifts.pdf.generated")} ${new Date().toLocaleDateString(locale)}`),
      14,
      28,
    );

    const head = [
      [
        safe(t("hr.shifts.employee")),
        ...days.map((d) => safe(`${d.label}\n${d.dayNum} ${d.month}`)),
      ],
    ];

    const body = employees.map((emp) => [
      safe(emp.name),
      ...days.map(({ date }) => {
        const s = shiftMap.get(`${emp.id}_${date}`);
        return s ? t(`hr.shifts.short.${s.type}`) : "";
      }),
    ]);

    autoTable(doc, {
      head,
      body,
      startY: 34,
      styles: { fontSize: 9, cellPadding: 2, halign: "center" },
      headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: "bold" },
      columnStyles: { 0: { halign: "left", cellWidth: 44 } },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      didParseCell: (data) => {
        if (data.section !== "body" || data.column.index === 0) return;
        const emp = employees[data.row.index];
        const day = days[data.column.index - 1];
        if (!emp || !day) return;
        const s = shiftMap.get(`${emp.id}_${day.date}`);
        if (s) data.cell.styles.fillColor = SHIFT_STYLES[s.type].pdfFill;
      },
    });

    const tableEndY =
      doc.lastAutoTable?.finalY ?? 34 + (employees.length + 1) * 8;

    const summaryHead = [
      [
        safe(t("hr.shifts.summary")),
        ...days.map((d) => safe(`${d.dayNum}/${d.month}`)),
        safe(t("hr.shifts.total")),
      ],
    ];
    const summaryBody: (string | number)[][] = SHIFT_TYPES.map((type) => {
      const row = summary.map((d) => d.counts[type]);
      const total = row.reduce((a, b) => a + b, 0);
      return [safe(t(`hr.shifts.types.${type}`)), ...row, total];
    });

    autoTable(doc, {
      head: summaryHead,
      body: summaryBody,
      startY: tableEndY + 6,
      styles: { fontSize: 9, cellPadding: 2, halign: "center" },
      headStyles: { fillColor: [60, 60, 60], textColor: 255, fontStyle: "bold" },
      columnStyles: { 0: { halign: "left", cellWidth: 44, fontStyle: "bold" } },
    });

    doc.save(`planificare-ture-${safe(department)}-${toISO(weekStart)}.pdf`);
  };

  // Callback stabil pentru ShiftCell; nu depinde de valoarea `shifts`,
  // astfel că ShiftCell poate fi memoizat efectiv.
  const assignShiftRef = React.useRef(assignShift);
  assignShiftRef.current = assignShift;
  const handleAssign = React.useCallback(
    (employeeId: string, date: string, type: ShiftType | null) => {
      assignShiftRef.current(employeeId, date, type);
    },
    [],
  );

  const gridColSpan = days.length + 1;

  // ── Render ───────────────────────────────────────────────
  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("hr.shifts.title")}</h1>
      </Header>

      <Main>
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>{t("hr.shifts.title")}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("hr.shifts.subtitle")}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger className="min-w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYEE_DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {t(`departments.${d}`, { defaultValue: d })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-1 rounded-md border px-1 py-0.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setWeekStart((w) => addDays(w, -7))}
                    aria-label={t("hr.shifts.prevWeek")}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm px-2 whitespace-nowrap font-medium">
                    {weekRangeLabel}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setWeekStart((w) => addDays(w, 7))}
                    aria-label={t("hr.shifts.nextWeek")}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWeekStart(startOfWeek(new Date()))}
                >
                  <CalendarDays className="h-4 w-4 mr-1.5" />
                  {t("hr.shifts.today")}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={employees.length === 0}
                  onClick={exportPdf}
                >
                  <FileDown className="h-4 w-4 mr-1.5" />
                  {t("hr.shifts.exportPdf")}
                </Button>
              </div>
            </div>

            {/* Legenda */}
            <div className="flex flex-wrap gap-3 mt-3">
              {SHIFT_TYPES.map((type) => (
                <div key={type} className="flex items-center gap-1.5 text-xs">
                  <span
                    className={`inline-block h-3 w-3 rounded-sm ${SHIFT_STYLES[type].swatch}`}
                  />
                  <span className="text-muted-foreground">
                    {t(`hr.shifts.types.${type}`)}
                  </span>
                </div>
              ))}
            </div>
          </CardHeader>

          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-20 bg-card min-w-[180px] border-r">
                      {t("hr.shifts.employee")}
                    </TableHead>
                    {days.map((d) => (
                      <TableHead key={d.date} className="text-center min-w-[110px]">
                        <div className="font-semibold">{d.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {d.dayNum} {d.month}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {employees.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={gridColSpan}
                        className="h-24 text-center text-muted-foreground"
                      >
                        {t("hr.shifts.noEmployees")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    employees.map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell className="sticky left-0 z-10 bg-card font-medium border-r">
                          <div>{emp.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {emp.position}
                          </div>
                        </TableCell>
                        {days.map((d) => {
                          const s = shiftMap.get(`${emp.id}_${d.date}`);
                          return (
                            <TableCell key={d.date} className="p-1 text-center">
                              <ShiftCell
                                employeeId={emp.id}
                                date={d.date}
                                current={s?.type ?? null}
                                onAssign={handleAssign}
                                labels={cellLabels}
                              />
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t("hr.shifts.summary")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">
                      {t("hr.shifts.shiftType")}
                    </TableHead>
                    {days.map((d) => (
                      <TableHead
                        key={d.date}
                        className="text-center min-w-[90px]"
                      >
                        {d.label}{" "}
                        <span className="text-muted-foreground">{d.dayNum}</span>
                      </TableHead>
                    ))}
                    <TableHead className="text-center">
                      {t("hr.shifts.total")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SHIFT_TYPES.map((type) => {
                    const counts = summary.map((d) => d.counts[type]);
                    const total = counts.reduce((a, b) => a + b, 0);
                    return (
                      <TableRow key={type}>
                        <TableCell className="font-medium">
                          <span className="inline-flex items-center gap-2">
                            <span
                              className={`inline-block h-3 w-3 rounded-sm ${SHIFT_STYLES[type].swatch}`}
                            />
                            {t(`hr.shifts.types.${type}`)}
                          </span>
                        </TableCell>
                        {summary.map((d, i) => (
                          <TableCell key={d.date} className="text-center">
                            {counts[i] > 0 ? (
                              counts[i]
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        ))}
                        <TableCell className="text-center font-semibold">
                          {total}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}

// ── Cell with popover dropdown ────────────────────────────
interface CellLabels {
  morning: string;
  afternoon: string;
  night: string;
  clear: string;
  assign: string;
  shortMorning: string;
  shortAfternoon: string;
  shortNight: string;
}

interface ShiftCellProps {
  employeeId: string;
  date: string;
  current: ShiftType | null;
  onAssign: (employeeId: string, date: string, type: ShiftType | null) => void;
  labels: CellLabels;
}

const ShiftCell = React.memo(function ShiftCell({
  employeeId,
  date,
  current,
  onAssign,
  labels,
}: ShiftCellProps) {
  const [open, setOpen] = React.useState(false);
  const style = current ? SHIFT_STYLES[current] : null;

  const shortFor = (type: ShiftType): string =>
    type === "morning"
      ? labels.shortMorning
      : type === "afternoon"
        ? labels.shortAfternoon
        : labels.shortNight;

  const fullFor = (type: ShiftType): string =>
    type === "morning" ? labels.morning : type === "afternoon" ? labels.afternoon : labels.night;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={current ? fullFor(current) : labels.assign}
          title={current ? fullFor(current) : labels.assign}
          className={`inline-flex h-8 w-full min-w-[70px] items-center justify-center rounded text-xs font-semibold transition-colors ${
            style
              ? style.cell
              : "border border-dashed border-muted-foreground/30 text-muted-foreground hover:bg-muted"
          }`}
        >
          {current ? shortFor(current) : "—"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1" align="center">
        <div className="flex flex-col gap-0.5">
          {SHIFT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                onAssign(employeeId, date, type);
                setOpen(false);
              }}
              className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm text-left hover:bg-accent ${
                current === type ? "bg-accent" : ""
              }`}
            >
              <span
                className={`inline-block h-3 w-3 rounded-sm ${SHIFT_STYLES[type].swatch}`}
              />
              {fullFor(type)}
            </button>
          ))}
          {current && (
            <>
              <div className="my-1 h-px bg-border" />
              <button
                type="button"
                onClick={() => {
                  onAssign(employeeId, date, null);
                  setOpen(false);
                }}
                className="rounded px-2 py-1.5 text-sm text-left text-red-500 hover:bg-red-500/10"
              >
                {labels.clear}
              </button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
});
