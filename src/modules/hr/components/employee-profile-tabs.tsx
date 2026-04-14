import * as React from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { getCollection, updateItem } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Employee, LeaveRequest, Bonus, EmployeeDocument } from "@/modules/hr/types";
import { useHrAuditLog } from "@/hooks/use-hr-audit-log";
import { formatDate } from "@/utils/format";
import { DocumentsTab } from "./documents-tab";
import { BONUS_TYPE_KEYS } from "../payroll/payroll-shared";

// ── Constants ────────────────────────────────────────────────

const LEAVE_TYPE_KEYS: Record<LeaveRequest["type"], string> = {
  annual: "leaves.types.annual",
  sick: "leaves.types.sick",
  unpaid: "leaves.types.unpaid",
  other: "leaves.types.other",
};

const LEAVE_STATUS_VARIANT: Record<
  LeaveRequest["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  approved: "default",
  pending: "secondary",
  rejected: "destructive",
};

const LEAVE_STATUS_KEYS: Record<LeaveRequest["status"], string> = {
  approved: "leaves.status.approved",
  pending: "leaves.status.pending",
  rejected: "leaves.status.rejected",
};

const ANNUAL_LEAVE_DAYS = 21;
const CHART_COLORS = ["#22c55e", "#ef4444"];

// ── Concedii Tab ─────────────────────────────────────────────

export function LeavesTab({ employeeId }: { employeeId: string }) {
  const { t } = useTranslation();
  const leaves = React.useMemo(
    () =>
      getCollection<LeaveRequest>(STORAGE_KEYS.leaveRequests).filter(
        (l) => l.employeeId === employeeId,
      ),
    [employeeId],
  );

  const currentYear = new Date().getFullYear();
  const usedAnnualDays = leaves
    .filter(
      (l) =>
        l.type === "annual" &&
        l.status === "approved" &&
        l.startDate.startsWith(String(currentYear)),
    )
    .reduce((sum, l) => sum + l.days, 0);
  const remainingDays = ANNUAL_LEAVE_DAYS - usedAnnualDays;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-muted/30 px-3 py-2 space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("profileTabs.remainingDays", { year: currentYear })}</span>
          <span className="font-semibold text-foreground">
            {Math.max(0, remainingDays)} / {ANNUAL_LEAVE_DAYS}
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${Math.max(0, (remainingDays / ANNUAL_LEAVE_DAYS) * 100)}%` }}
          />
        </div>
      </div>

      {leaves.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">{t("profileTabs.noLeaveRequests")}</p>
      ) : (
        <div className="max-h-[260px] overflow-auto rounded-md border">
          <Table className="min-w-[420px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t("profileTabs.type")}</TableHead>
                <TableHead>{t("profileTabs.startDate")}</TableHead>
                <TableHead>{t("profileTabs.endDate")}</TableHead>
                <TableHead className="text-right">{t("profileTabs.days")}</TableHead>
                <TableHead>{t("profileTabs.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaves
                .slice()
                .sort((a, b) => b.startDate.localeCompare(a.startDate))
                .map((leave) => (
                  <TableRow key={leave.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {t(LEAVE_TYPE_KEYS[leave.type])}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatDate(leave.startDate)}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatDate(leave.endDate)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {leave.days}
                    </TableCell>
                    <TableCell>
                      <Badge variant={LEAVE_STATUS_VARIANT[leave.status]}>
                        {t(LEAVE_STATUS_KEYS[leave.status])}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ── Documente Tab ────────────────────────────────────────────

interface DocsTabProps {
  employee: Employee;
  onUpdate: (emp: Employee) => void;
}

export function DocsTabWrapper({ employee, onUpdate }: DocsTabProps) {
  const { log } = useHrAuditLog();

  const handleChange = React.useCallback((docs: EmployeeDocument[]) => {
    const oldCount = employee.documents.length;
    const newCount = docs.length;
    const action = newCount > oldCount ? "create" : newCount < oldCount ? "delete" : "update";
    const changedDoc = action === "delete"
      ? employee.documents.find((d) => !docs.some((nd) => nd.id === d.id))
      : action === "create"
        ? docs.find((d) => !employee.documents.some((od) => od.id === d.id))
        : docs.find((d) => {
            const old = employee.documents.find((od) => od.id === d.id);
            return old && JSON.stringify(old) !== JSON.stringify(d);
          });

    const updated = { ...employee, documents: docs };
    updateItem<Employee>(
      STORAGE_KEYS.employees,
      (e) => e.id === employee.id,
      () => updated,
    );
    log({
      action,
      entity: "document",
      entityId: changedDoc?.id ?? employee.id,
      entityLabel: employee.name,
      details: changedDoc ? `${changedDoc.type}: ${changedDoc.name || changedDoc.documentNumber || "—"}` : undefined,
    });
    onUpdate(updated);
  }, [employee, onUpdate, log]);

  return (
    <DocumentsTab documents={employee.documents} onChange={handleChange} />
  );
}

// ── Bonusuri Tab ─────────────────────────────────────────────

export function BonusesTab({ employeeId }: { employeeId: string }) {
  const { t } = useTranslation();
  const bonuses = React.useMemo(
    () =>
      getCollection<Bonus>(STORAGE_KEYS.bonuses).filter(
        (b) => b.employeeId === employeeId,
      ),
    [employeeId],
  );

  const totalNet = bonuses.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-muted/30 px-3 py-2 flex flex-wrap items-center justify-between gap-1">
        <span className="text-sm text-muted-foreground">{t("profileTabs.totalNetBonuses")}:</span>
        <span className={`text-sm font-semibold ${totalNet >= 0 ? "text-green-600" : "text-red-600"}`}>
          {totalNet >= 0 ? "+" : ""}{totalNet.toLocaleString("ro-RO")} RON
        </span>
      </div>

      {bonuses.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">{t("profileTabs.noRecords")}</p>
      ) : (
        <div className="max-h-[260px] overflow-auto rounded-md border">
          <Table className="min-w-[380px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t("profileTabs.date")}</TableHead>
                <TableHead>{t("profileTabs.type")}</TableHead>
                <TableHead>{t("profileTabs.description")}</TableHead>
                <TableHead className="text-right">{t("profileTabs.amount")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bonuses
                .slice()
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((bonus) => (
                  <TableRow key={bonus.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatDate(bonus.date)}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {t(BONUS_TYPE_KEYS[bonus.type])}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">
                      {bonus.description}
                    </TableCell>
                    <TableCell className={`text-right text-sm font-medium whitespace-nowrap ${bonus.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {bonus.amount >= 0 ? "+" : ""}{bonus.amount.toLocaleString("ro-RO")} RON
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ── Statistici Tab ───────────────────────────────────────────

export function StatsTab({ employeeId }: { employeeId: string }) {
  const { t } = useTranslation();
  const leaves = React.useMemo(
    () =>
      getCollection<LeaveRequest>(STORAGE_KEYS.leaveRequests).filter(
        (l) => l.employeeId === employeeId && l.status === "approved",
      ),
    [employeeId],
  );

  const bonuses = React.useMemo(
    () =>
      getCollection<Bonus>(STORAGE_KEYS.bonuses).filter(
        (b) => b.employeeId === employeeId,
      ),
    [employeeId],
  );

  const leavesByMonth = React.useMemo(() => {
    const now = new Date();
    const months: { month: string; zile: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("ro-RO", { month: "short", year: "2-digit" });
      const zile = leaves
        .filter((l) => l.startDate.startsWith(key))
        .reduce((sum, l) => sum + l.days, 0);
      months.push({ month: label, zile });
    }
    return months;
  }, [leaves]);

  const totalBonusuri = bonuses.filter((b) => b.amount > 0).reduce((sum, b) => sum + b.amount, 0);
  const totalAmenzi = bonuses.filter((b) => b.amount < 0).reduce((sum, b) => sum + Math.abs(b.amount), 0);

  const pieData = [
    { name: t("profileTabs.bonuses"), value: totalBonusuri, fill: CHART_COLORS[0] },
    { name: t("profileTabs.fines"), value: totalAmenzi, fill: CHART_COLORS[1] },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium mb-2">{t("profileTabs.leaveDaysPerMonth")}</p>
        {leavesByMonth.every((m) => m.zile === 0) ? (
          <p className="text-sm text-muted-foreground">{t("profileTabs.noDataAvailable")}</p>
        ) : (
          <div className="outline-none" tabIndex={-1}>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={leavesByMonth} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} style={{ outline: "none" }}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(value) => [`${value} zile`, "Concediu"]} />
                <Bar dataKey="zile" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div>
        <p className="text-sm font-medium mb-2">{t("profileTabs.bonusesVsFines")}</p>
        {pieData.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("profileTabs.noDataAvailable")}</p>
        ) : (
          <div className="outline-none" tabIndex={-1}>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={55} dataKey="value" />
                <Legend formatter={(value, entry: { payload?: { value?: number } }) => `${value}: ${Number(entry.payload?.value ?? 0).toLocaleString("ro-RO")} RON`} />
                <Tooltip formatter={(value) => [`${Number(value).toLocaleString("ro-RO")} RON`]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
