// ──────────────────────────────────────────────────────────
// C17. Rapoarte HR
// Ruta: /reports/hr
// DateRangePicker + 4 grafice Recharts + KPI cards + PDF export
// ──────────────────────────────────────────────────────────

import * as React from "react";
import { format, parseISO, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { ro, enGB, type Locale } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import {
  PieChart, Pie, Cell,
  BarChart, Bar,
  RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import {
  CalendarIcon, Download, Loader2,
  Users, CalendarDays, TrendingUp, TrendingDown,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useLocation } from "@tanstack/react-router";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Employee, LeaveRequest, Bonus, AttendanceRecord } from "@/modules/hr/types";
import { useMobile } from "@/hooks/use-mobile";

// ── Constante ──────────────────────────────────────────────

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

// ── Helpers ────────────────────────────────────────────────

function stripDiacritics(str: string): string {
  return str
    .replace(/[ăâ]/g, "a").replace(/[ĂÂ]/g, "A")
    .replace(/î/g, "i").replace(/Î/g, "I")
    .replace(/[șş]/g, "s").replace(/[ȘŞ]/g, "S")
    .replace(/[țţ]/g, "t").replace(/[ȚŢ]/g, "T");
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency", currency: "RON", maximumFractionDigits: 0,
  }).format(n);
}

function inRange(dateStr: string, range: DateRange | undefined): boolean {
  if (!range?.from) return true;
  try {
    return isWithinInterval(parseISO(dateStr), {
      start: startOfDay(range.from),
      end: endOfDay(range.to ?? range.from),
    });
  } catch { return false; }
}

// ── Builders ───────────────────────────────────────────────

function buildDeptPie(employees: Employee[], t: TFunction) {
  const map: Record<string, number> = {};
  for (const emp of employees) {
    map[emp.department] = (map[emp.department] ?? 0) + 1;
  }
  return Object.entries(map).map(([name, value]) => ({
    name: t(`hrReports.departments.${name}`, { defaultValue: name }),
    value,
  }));
}

function buildLeavesPerMonth(leaves: LeaveRequest[], range: DateRange | undefined, dateLocale: Locale) {
  const map: Record<string, { luna: string; CO: number; CM: number }> = {};
  for (const l of leaves) {
    if (l.status !== "approved") continue;
    if (l.type !== "annual" && l.type !== "sick") continue;
    if (!inRange(l.startDate, range)) continue;
    const month = l.startDate.slice(0, 7);
    if (!map[month]) {
      const [year, m] = month.split("-");
      const d = new Date(Number(year), Number(m) - 1, 1);
      map[month] = { luna: format(d, "MMM yyyy", { locale: dateLocale }), CO: 0, CM: 0 };
    }
    if (l.type === "annual") map[month].CO += l.days;
    else map[month].CM += l.days;
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}

function buildTopBonuses(employees: Employee[], bonuses: Bonus[], range: DateRange | undefined) {
  const map: Record<string, number> = {};
  for (const b of bonuses) {
    if (b.type === "amenda") continue;
    if (!inRange(b.date, range)) continue;
    map[b.employeeId] = (map[b.employeeId] ?? 0) + Math.abs(b.amount);
  }
  return Object.entries(map)
    .map(([id, total]) => ({
      name: employees.find((e) => e.id === id)?.name ?? id,
      total: Math.round(total),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}

function buildAbsenceRate(employees: Employee[], attendance: AttendanceRecord[], range: DateRange | undefined, t: TFunction) {
  const empDept: Record<string, string> = {};
  employees.forEach((e) => { empDept[e.id] = e.department; });

  const depts = [...new Set(employees.map((e) => e.department))];
  const deptMap: Record<string, { total: number; absent: number; fill: string }> = {};
  depts.forEach((dept, i) => {
    deptMap[dept] = { total: 0, absent: 0, fill: COLORS[i % COLORS.length] };
  });

  for (const rec of attendance) {
    if (!inRange(rec.date, range)) continue;
    const dept = empDept[rec.employeeId];
    if (!dept || !deptMap[dept]) continue;
    deptMap[dept].total++;
    if (rec.status === "A") deptMap[dept].absent++;
  }

  return Object.entries(deptMap)
    .map(([name, { total, absent, fill }]) => ({
      name: t(`hrReports.departments.${name}`, { defaultValue: name }),
      rata: total > 0 ? Math.round((absent / total) * 100) : 0,
      fill,
    }))
    .sort((a, b) => b.rata - a.rata);
}

function buildKPIs(
  employees: Employee[],
  leaves: LeaveRequest[],
  bonuses: Bonus[],
  range: DateRange | undefined,
) {
  const totalAngajati = employees.length;

  const leavesInPeriod = leaves.filter(
    (l) => l.status === "approved" && inRange(l.startDate, range),
  );
  const totalLeaveDays = leavesInPeriod.reduce((s, l) => s + l.days, 0);
  const avgLeaveDays = employees.length > 0 ? totalLeaveDays / employees.length : 0;

  const bonusesInPeriod = bonuses.filter((b) => inRange(b.date, range));
  const totalBonusuri = bonusesInPeriod
    .filter((b) => b.type !== "amenda")
    .reduce((s, b) => s + b.amount, 0);
  const totalAmenzi = bonusesInPeriod
    .filter((b) => b.type === "amenda")
    .reduce((s, b) => s + Math.abs(b.amount), 0);

  return { totalAngajati, avgLeaveDays, totalBonusuri, totalAmenzi };
}

// ── PDF Export ─────────────────────────────────────────────

async function exportPDF(
  kpis: ReturnType<typeof buildKPIs>,
  deptData: ReturnType<typeof buildDeptPie>,
  bonusData: ReturnType<typeof buildTopBonuses>,
  absenceData: ReturnType<typeof buildAbsenceRate>,
  range: DateRange | undefined,
  chartRefs: Record<string, HTMLDivElement | null>,
  t: TFunction,
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const imgW = pageW - margin * 2;

  const rangeLabel = range?.from
    ? `${format(range.from, "dd.MM.yyyy")}${range.to ? ` - ${format(range.to, "dd.MM.yyyy")}` : ""}`
    : t("hrReports.pdf.allData");

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(stripDiacritics(t("hrReports.pdf.title")), margin, 16);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`${t("hrReports.pdf.interval")}: ${rangeLabel}`, margin, 24);
  doc.text(`${t("hrReports.pdf.generated")}: ${format(new Date(), "dd.MM.yyyy HH:mm")}`, margin, 30);

  let y = 40;
  doc.setFontSize(11);
  doc.text(`${stripDiacritics(t("hrReports.pdf.totalEmployees"))}: ${kpis.totalAngajati}`, margin, y); y += 6;
  doc.text(`${stripDiacritics(t("hrReports.pdf.avgLeaveDays"))}: ${kpis.avgLeaveDays.toFixed(1)}`, margin, y); y += 6;
  doc.text(`${stripDiacritics(t("hrReports.pdf.totalBonuses"))}: ${stripDiacritics(formatCurrency(kpis.totalBonusuri))}`, margin, y); y += 6;
  doc.text(`${stripDiacritics(t("hrReports.pdf.totalFines"))}: ${stripDiacritics(formatCurrency(kpis.totalAmenzi))}`, margin, y); y += 10;

  const charts: { ref: HTMLDivElement | null; title: string }[] = [
    { ref: chartRefs.dept, title: t("hrReports.pdf.employeesPerDept") },
    { ref: chartRefs.leaves, title: t("hrReports.pdf.leavesPerMonth") },
    { ref: chartRefs.bonuses, title: t("hrReports.pdf.topBonuses") },
    { ref: chartRefs.absence, title: t("hrReports.pdf.absenceRate") },
  ];

  for (const { ref, title } of charts) {
    if (!ref) continue;
    try {
      const canvas = await html2canvas(ref, {
        backgroundColor: null, scale: 2, useCORS: true, logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const imgH = imgW * (canvas.height / canvas.width);
      if (y + imgH + 14 > pageH - 10) { doc.addPage(); y = 14; }
      doc.setFontSize(11);
      doc.text(stripDiacritics(title), margin, y);
      y += 5;
      doc.addImage(imgData, "PNG", margin, y, imgW, imgH);
      y += imgH + 10;
    } catch { /* html2canvas render failed — skip chart */ }
  }

  doc.addPage(); y = 14;

  function addTable(title: string, head: string[], body: string[][]) {
    if (y + 30 > pageH - 10) { doc.addPage(); y = 14; }
    doc.setFontSize(11);
    doc.text(stripDiacritics(title), margin, y);
    y += 4;
    autoTable(doc, {
      startY: y, head: [head], body,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 30, 30] },
      margin: { left: margin, right: margin },
      didParseCell: (data) => {
        if (typeof data.cell.text[0] === "string")
          data.cell.text[0] = stripDiacritics(data.cell.text[0]);
      },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  addTable(
    t("hrReports.pdf.employeesPerDept"),
    [t("hrReports.pdf.department"), t("hrReports.pdf.numEmployees")],
    deptData.map((r) => [r.name, String(r.value)]),
  );

  addTable(
    t("hrReports.pdf.topBonuses"),
    [t("hrReports.pdf.employee"), t("hrReports.pdf.totalBonusesLabel")],
    bonusData.map((r) => [r.name, stripDiacritics(formatCurrency(r.total))]),
  );

  addTable(
    t("hrReports.pdf.absenceRate"),
    [t("hrReports.pdf.department"), t("hrReports.pdf.absenceRatePercent")],
    absenceData.map((r) => [r.name, `${r.rata}%`]),
  );

  doc.save(`${t("hrReports.pdf.filename")}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

// ── DateRangePicker ────────────────────────────────────────

function DateRangePicker({
  value, onChange, isMobile, dateLocale,
}: {
  value: DateRange | undefined;
  onChange: (r: DateRange | undefined) => void;
  isMobile: boolean;
  dateLocale: Locale;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            isMobile ? "w-full" : "w-[260px]",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {value?.from
            ? value.to
              ? <>{format(value.from, "dd MMM yyyy", { locale: dateLocale })} - {format(value.to, "dd MMM yyyy", { locale: dateLocale })}</>
              : format(value.from, "dd MMM yyyy", { locale: dateLocale })
            : t("hrReports.selectInterval")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={isMobile ? "center" : "start"}>
        <Calendar
          mode="range"
          selected={value}
          onSelect={onChange}
          numberOfMonths={isMobile ? 1 : 2}
          locale={dateLocale}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <p className="py-10 text-center text-sm text-muted-foreground">
      {label}
    </p>
  );
}

// ── Pagina ─────────────────────────────────────────────────

export default function HRReportsPage() {
  const { t, i18n } = useTranslation();
  const isMobile = useMobile(640);
  const { pathname } = useLocation();
  const activeLanguage = i18n.resolvedLanguage ?? i18n.language;
  const dateLocale = activeLanguage.startsWith("en") ? enGB : ro;

  const employees = React.useMemo(() => getCollection<Employee>(STORAGE_KEYS.employees), []);
  const leaves = React.useMemo(() => getCollection<LeaveRequest>(STORAGE_KEYS.leaveRequests), []);
  const bonuses = React.useMemo(() => getCollection<Bonus>(STORAGE_KEYS.bonuses), []);
  const attendance = React.useMemo(() => getCollection<AttendanceRecord>(STORAGE_KEYS.attendance), []);

  const [range, setRange] = React.useState<DateRange | undefined>(undefined);
  const [exporting, setExporting] = React.useState(false);

  const chartRefs = React.useRef<Record<string, HTMLDivElement | null>>({
    dept: null, leaves: null, bonuses: null, absence: null,
  });

  const deptData = React.useMemo(() => buildDeptPie(employees, t), [employees, t]);
  const leavesData = React.useMemo(() => buildLeavesPerMonth(leaves, range, dateLocale), [leaves, range, dateLocale]);
  const bonusData = React.useMemo(() => buildTopBonuses(employees, bonuses, range), [employees, bonuses, range]);
  const absenceData = React.useMemo(() => buildAbsenceRate(employees, attendance, range, t), [employees, attendance, range, t]);
  const kpis = React.useMemo(() => buildKPIs(employees, leaves, bonuses, range), [employees, leaves, bonuses, range]);

  const chartH = isMobile ? 200 : 260;
  const noData = <EmptyChart label={t("hrReports.noData")} />;

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportPDF(kpis, deptData, bonusData, absenceData, range, chartRefs.current, t);
    } finally {
      setExporting(false);
    }
  };

  const topNavLinks = [
    { title: t("sidebar.reports.transport"), href: "/reports/transport", isActive: pathname === "/reports/transport" },
    { title: t("sidebar.reports.financial"), href: "/reports/financial", isActive: pathname === "/reports/financial" },
    { title: t("sidebar.reports.fleet"), href: "/reports/fleet", isActive: pathname === "/reports/fleet" },
    { title: t("sidebar.reports.hr"), href: "/reports/hr", isActive: pathname === "/reports/hr" },
  ];

  return (
    <>
      <Header>
        <TopNav links={topNavLinks} />
      </Header>
      <Main>
        {/* Titlu + Export */}
        <div className={cn("mb-6 flex gap-3", isMobile ? "flex-col" : "items-center justify-between")}>
          <div>
            <h1 className="text-xl font-bold">{t("hrReports.title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("hrReports.subtitle")}
            </p>
          </div>
          <Button
            size="sm"
            disabled={exporting}
            onClick={handleExport}
            className={isMobile ? "w-full" : ""}
          >
            {exporting
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <Download className="mr-2 h-4 w-4" />}
            {exporting ? t("hrReports.exporting") : t("hrReports.exportPdf")}
          </Button>
        </div>

        {/* Filtre */}
        <div className={cn("mb-6 flex gap-3", isMobile ? "flex-col" : "flex-wrap items-center")}>
          <DateRangePicker value={range} onChange={setRange} isMobile={isMobile} dateLocale={dateLocale} />
          {range && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRange(undefined)}
              className={isMobile ? "w-full" : ""}
            >
              {t("hrReports.reset")}
            </Button>
          )}
        </div>

        {/* KPI Cards */}
        <div className={cn("mb-6 grid gap-4", isMobile ? "grid-cols-2" : "grid-cols-4")}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{t("hrReports.kpi.totalEmployees")}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold">{kpis.totalAngajati}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{t("hrReports.kpi.avgLeaveDays")}</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold">{kpis.avgLeaveDays.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">{t("hrReports.kpi.avgLeaveDaysUnit")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{t("hrReports.kpi.totalBonuses")}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-green-500">{formatCurrency(kpis.totalBonusuri)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{t("hrReports.kpi.totalFines")}</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-red-500">{formatCurrency(kpis.totalAmenzi)}</p>
            </CardContent>
          </Card>
        </div>

        <Separator className="mb-6" />

        {/* Grafice */}
        <div className={cn("grid gap-6", isMobile ? "grid-cols-1" : "grid-cols-2")}>

          {/* 1. PieChart — Angajați pe departament */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{t("hrReports.charts.employeesPerDept")}</CardTitle>
            </CardHeader>
            <CardContent>
              {deptData.length === 0 ? noData : (
                <div ref={(el) => { chartRefs.current.dept = el; }}>
                  <ResponsiveContainer width="100%" height={chartH}>
                    <PieChart>
                      <Pie
                        data={deptData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={isMobile ? 70 : 90}
                        label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {deptData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val, name) => [val, name]} />
                      <Legend
                        iconSize={8}
                        wrapperStyle={{ fontSize: isMobile ? "10px" : "11px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. StackedBarChart — Concedii pe lună/tip */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{t("hrReports.charts.leavesPerMonth")}</CardTitle>
            </CardHeader>
            <CardContent>
              {leavesData.length === 0 ? noData : (
                <div ref={(el) => { chartRefs.current.leaves = el; }}>
                  <ResponsiveContainer width="100%" height={chartH}>
                    <BarChart
                      data={leavesData}
                      margin={{ top: 4, right: 8, left: 0, bottom: isMobile ? 20 : 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="luna"
                        tick={{ fontSize: isMobile ? 10 : 11 }}
                        angle={-30}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis tick={{ fontSize: isMobile ? 10 : 11 }} width={35} />
                      <Tooltip
                        formatter={(val, name) => [
                          t("hrReports.tooltip.days", { val }),
                          name === "CO" ? t("hrReports.tooltip.annualLeave") : t("hrReports.tooltip.sickLeave"),
                        ]}
                      />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: isMobile ? "10px" : "11px" }} />
                      <Bar dataKey="CO" name="CO" stackId="a" fill={COLORS[0]} />
                      <Bar dataKey="CM" name="CM" stackId="a" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. BarChart — Top 5 angajați bonusuri */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{t("hrReports.charts.topBonuses")}</CardTitle>
            </CardHeader>
            <CardContent>
              {bonusData.length === 0 ? noData : (
                <div ref={(el) => { chartRefs.current.bonuses = el; }}>
                  <ResponsiveContainer width="100%" height={chartH}>
                    <BarChart
                      data={bonusData}
                      layout="vertical"
                      margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: isMobile ? 10 : 11 }}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: isMobile ? 10 : 11 }}
                        width={isMobile ? 80 : 110}
                      />
                      <Tooltip formatter={(val) => [formatCurrency(Number(val)), t("hrReports.tooltip.bonuses")]} />
                      <Bar dataKey="total" fill={COLORS[1]} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 4. RadialBarChart — Rata absențe pe departament */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{t("hrReports.charts.absenceRate")}</CardTitle>
            </CardHeader>
            <CardContent>
              {absenceData.every((d) => d.rata === 0) ? noData : (
                <div ref={(el) => { chartRefs.current.absence = el; }}>
                  <ResponsiveContainer width="100%" height={chartH}>
                    <RadialBarChart
                      innerRadius="20%"
                      outerRadius="90%"
                      data={absenceData}
                      startAngle={180}
                      endAngle={0}
                    >
                      <RadialBar
                        dataKey="rata"
                        label={{ position: "insideStart", fill: "#fff", fontSize: isMobile ? 9 : 11 }}
                        background
                      />
                      <Tooltip formatter={(val) => [`${val}%`, t("hrReports.tooltip.absenceRate")]} />
                      <Legend
                        iconSize={isMobile ? 8 : 10}
                        formatter={(value) => (
                          <span className={isMobile ? "text-[10px]" : "text-xs"}>{value}</span>
                        )}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </Main>
    </>
  );
}
