// HRNotificationsCenter — bell pentru zona HR. Genereaza notificari pentru
// documente angajati care expira + cereri concediu in asteptare.
// UI-ul delegat la NotificationCenter; aici doar logica de domeniu.

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, FileWarning } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import { formatDate } from "@/utils/format";
import type { Employee, LeaveRequest } from "@/modules/hr/types";
import type { AppNotification } from "@/modules/notifications/notification.types";
import { NotificationCenter } from "@/components/notifications/notification-center";

const HR_NOTIFICATIONS_READ_KEY = "transmarin_hr_notifications_read";
const DOCUMENT_ALERT_DAYS = 30;

const DOC_LABEL_KEYS: Record<string, string> = {
  license: "hrNotifications.docLabels.license",
  tachograph: "hrNotifications.docLabels.tachograph",
  adr: "hrNotifications.docLabels.adr",
  medical: "hrNotifications.docLabels.medical",
  contract: "hrNotifications.docLabels.contract",
  certificate: "hrNotifications.docLabels.certificate",
  other: "hrNotifications.docLabels.other",
};

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  if (isNaN(target.getTime())) return Infinity;
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function generateHRNotifications(t: TFunction): AppNotification[] {
  const notifications: AppNotification[] = [];
  const now = new Date();

  const employees = getCollection<Employee>(STORAGE_KEYS.employees);
  const leaves = getCollection<LeaveRequest>(STORAGE_KEYS.leaveRequests);

  for (const emp of employees) {
    for (const doc of emp.documents ?? []) {
      if (!doc.expiryDate) continue;
      const days = daysUntil(doc.expiryDate);
      if (days > DOCUMENT_ALERT_DAYS) continue;

      const label = t(DOC_LABEL_KEYS[doc.type] ?? DOC_LABEL_KEYS.other);
      const expired = days <= 0;
      const date = formatDate(doc.expiryDate);

      notifications.push({
        id: `hr-doc-${emp.id}-${doc.id}`,
        type: "hr_document_expiry",
        title: expired
          ? t("hrNotifications.types.docExpired", { label, name: emp.name })
          : t("hrNotifications.types.docExpiring", { label, name: emp.name }),
        message: expired
          ? t("hrNotifications.types.docExpiredMsg", { label, name: emp.name, date })
          : t("hrNotifications.types.docExpiringMsg", { label, name: emp.name, days, date }),
        createdAt: now.toISOString(),
        read: false,
        entityId: emp.id,
      });
    }
  }

  for (const leave of leaves) {
    if (leave.status !== "pending") continue;
    const emp = employees.find((e) => e.id === leave.employeeId);
    const name = emp?.name ?? leave.employeeId;

    notifications.push({
      id: `hr-leave-${leave.id}`,
      type: "pending_leave",
      title: t("hrNotifications.types.pendingLeave", { name }),
      message: t("hrNotifications.types.pendingLeaveMsg", {
        name,
        days: leave.days,
        from: formatDate(leave.startDate),
        to: formatDate(leave.endDate),
      }),
      createdAt: now.toISOString(),
      read: false,
      entityId: leave.id,
    });
  }

  return notifications;
}

function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(HR_NOTIFICATIONS_READ_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  localStorage.setItem(HR_NOTIFICATIONS_READ_KEY, JSON.stringify([...ids]));
}

export function HRNotificationsCenter() {
  const { t } = useTranslation();
  const [readIds, setReadIds] = useState<Set<string>>(loadReadIds);

  const notifications = useMemo(
    () => generateHRNotifications(t).map((n) => ({ ...n, read: readIds.has(n.id) })),
    [t, readIds],
  );

  useEffect(() => {
    saveReadIds(readIds);
  }, [readIds]);

  const markAsRead = (id: string) => setReadIds((prev) => new Set([...prev, id]));
  const markAllAsRead = () => setReadIds(new Set(notifications.map((n) => n.id)));

  return (
    <NotificationCenter
      labels={{
        title: t("hrNotifications.title"),
        empty: t("hrNotifications.empty"),
        markAllRead: t("hrNotifications.markAllRead"),
        markRead: t("hrNotifications.markRead"),
        newBadge: (count) => t("hrNotifications.newBadge", { count }),
        total: (count) => t("hrNotifications.total", { count }),
      }}
      notifications={notifications}
      onMarkAsRead={markAsRead}
      onMarkAllAsRead={markAllAsRead}
      renderItem={(n) => ({
        icon: n.type === "hr_document_expiry"
          ? <FileWarning className="h-4 w-4 text-yellow-500" />
          : <CalendarClock className="h-4 w-4 text-blue-500" />,
        title: n.title,
        message: n.message,
      })}
    />
  );
}
