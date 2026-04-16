// AccountingNotificationsCenter — centru notificari pentru zona Contabilitate.
// Logica: genereaza 4 tipuri (scadent azi, restanta >7 zile, buget depasit,
// plata neconfirmata >3 zile). Persistare FIFO in STORAGE_KEYS.accounting_notifications.
// UI-ul delegat la NotificationCenter (bell + popover/sheet).

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Clock,
  PiggyBank,
  type LucideIcon,
} from "lucide-react";
import {
  differenceInCalendarDays,
  parseISO,
  startOfToday,
} from "date-fns";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { getCollection, setCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import { formatCurrency, formatDate } from "@/utils/format";
import type { BudgetCategory, Payment } from "@/modules/accounting/types";
import { getUnifiedInvoices } from "@/modules/accounting/utils/invoices-store";
import { NotificationCenter } from "@/components/notifications/notification-center";

// ── Tipuri & config ────────────────────────────────────────

type AccountingNotificationType =
  | "invoice_due_today"
  | "invoice_overdue"
  | "budget_exceeded"
  | "payment_unconfirmed";

interface NotificationMeta {
  icon: LucideIcon;
  iconClass: string;
  titleKey: string;
  messageKey: string;
  route: string;
}

const NOTIFICATION_META: Record<AccountingNotificationType, NotificationMeta> = {
  invoice_due_today: {
    icon: CalendarClock,
    iconClass: "text-yellow-500",
    titleKey: "accountingNotifications.types.invoiceDueToday.title",
    messageKey: "accountingNotifications.types.invoiceDueToday.message",
    route: "/accounting/due-dates",
  },
  invoice_overdue: {
    icon: AlertTriangle,
    iconClass: "text-red-500",
    titleKey: "accountingNotifications.types.invoiceOverdue.title",
    messageKey: "accountingNotifications.types.invoiceOverdue.message",
    route: "/accounting/due-dates",
  },
  budget_exceeded: {
    icon: PiggyBank,
    iconClass: "text-orange-500",
    titleKey: "accountingNotifications.types.budgetExceeded.title",
    messageKey: "accountingNotifications.types.budgetExceeded.message",
    route: "/accounting/budget",
  },
  payment_unconfirmed: {
    icon: Clock,
    iconClass: "text-blue-500",
    titleKey: "accountingNotifications.types.paymentUnconfirmed.title",
    messageKey: "accountingNotifications.types.paymentUnconfirmed.message",
    route: "/accounting/payments",
  },
};

export interface AccountingNotification {
  id: string;
  type: AccountingNotificationType;
  params: Record<string, string | number>;
  createdAt: string;
  read: boolean;
}

const MAX_NOTIFICATIONS = 200;
const OVERDUE_THRESHOLD_DAYS = 7;
const PAYMENT_UNCONFIRMED_THRESHOLD_DAYS = 3;
const DEFAULT_BUDGET_CATEGORY = "altele";

// ── Helpers ────────────────────────────────────────────────

function daysSince(dateStr: string, today: Date): number | null {
  if (!dateStr) return null;
  const d = parseISO(dateStr);
  return isNaN(d.getTime()) ? null : differenceInCalendarDays(today, d);
}

// ── Generare ───────────────────────────────────────────────

function generateAccountingNotifications(now: Date): AccountingNotification[] {
  const today = startOfToday();
  const createdAt = now.toISOString();
  const out: AccountingNotification[] = [];

  const invoices = getUnifiedInvoices();
  const payments = getCollection<Payment>(STORAGE_KEYS.payments);
  const budgets = getCollection<BudgetCategory>(STORAGE_KEYS.budgets);

  for (const inv of invoices) {
    if (inv.status === "paid") continue;
    const overdue = daysSince(inv.dueDate, today);
    if (overdue === null) continue;

    const invoiceParams = {
      number: inv.number,
      client: inv.clientName,
      date: formatDate(inv.dueDate),
    };

    if (overdue === 0) {
      out.push({
        id: `acc-due-today-${inv.id}`,
        type: "invoice_due_today",
        params: invoiceParams,
        createdAt,
        read: false,
      });
    } else if (overdue > OVERDUE_THRESHOLD_DAYS) {
      out.push({
        id: `acc-overdue-${inv.id}`,
        type: "invoice_overdue",
        params: { ...invoiceParams, days: overdue },
        createdAt,
        read: false,
      });
    }
  }

  const expenseByCategory = invoices.reduce<Record<string, number>>((acc, inv) => {
    if (inv.type !== "expense") return acc;
    const cat = inv.category ?? DEFAULT_BUDGET_CATEGORY;
    acc[cat] = (acc[cat] ?? 0) + inv.total;
    return acc;
  }, {});

  for (const cat of budgets) {
    const real = expenseByCategory[cat.id] ?? 0;
    if (cat.allocated > 0 && real > cat.allocated) {
      out.push({
        id: `acc-budget-${cat.id}`,
        type: "budget_exceeded",
        params: {
          name: cat.name,
          amount: formatCurrency(real - cat.allocated),
        },
        createdAt,
        read: false,
      });
    }
  }

  for (const p of payments) {
    if (p.status !== "in_asteptare") continue;
    const days = daysSince(p.date, today);
    if (days === null || days <= PAYMENT_UNCONFIRMED_THRESHOLD_DAYS) continue;
    out.push({
      id: `acc-payment-unconfirmed-${p.id}`,
      type: "payment_unconfirmed",
      params: {
        number: p.invoiceNumber,
        client: p.clientName,
        date: formatDate(p.date),
        days,
      },
      createdAt,
      read: false,
    });
  }

  return out;
}

// ── Persistare (FIFO, max 200) ─────────────────────────────

function loadStored(): AccountingNotification[] {
  return getCollection<AccountingNotification>(STORAGE_KEYS.accounting_notifications);
}

function persist(items: AccountingNotification[]): void {
  setCollection(STORAGE_KEYS.accounting_notifications, items);
}

function mergeNotifications(
  stored: AccountingNotification[],
  fresh: AccountingNotification[],
): AccountingNotification[] {
  const byId = new Map<string, AccountingNotification>();
  for (const n of stored) byId.set(n.id, n);
  for (const n of fresh) {
    const existing = byId.get(n.id);
    byId.set(n.id, existing
      ? { ...n, read: existing.read, createdAt: existing.createdAt }
      : n);
  }
  return Array.from(byId.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_NOTIFICATIONS);
}

// ── Componenta principala ──────────────────────────────────

export function AccountingNotificationsCenter() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [items, setItems] = useState<AccountingNotification[]>([]);

  const refresh = useCallback(() => {
    const fresh = generateAccountingNotifications(new Date());
    const merged = mergeNotifications(loadStored(), fresh);
    persist(merged);
    setItems(merged);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const markAsRead = useCallback((id: string) => {
    setItems((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      persist(updated);
      return updated;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setItems((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      persist(updated);
      return updated;
    });
  }, []);

  const handleItemClick = useCallback((n: AccountingNotification) => {
    if (!n.read) markAsRead(n.id);
    navigate({ to: NOTIFICATION_META[n.type].route });
  }, [markAsRead, navigate]);

  return (
    <NotificationCenter
      labels={{
        title: t("accountingNotifications.title"),
        empty: t("accountingNotifications.empty"),
        markAllRead: t("accountingNotifications.markAllRead"),
        markRead: t("accountingNotifications.markRead"),
        newBadge: (count) => t("accountingNotifications.newBadge", { count }),
        total: (count) => t("accountingNotifications.total", { count }),
      }}
      notifications={items}
      onMarkAsRead={markAsRead}
      onMarkAllAsRead={markAllAsRead}
      onItemClick={handleItemClick}
      renderItem={(n) => {
        const meta = NOTIFICATION_META[n.type];
        const Icon = meta.icon;
        return {
          icon: <Icon className={cn("h-4 w-4", meta.iconClass)} />,
          title: t(meta.titleKey, n.params),
          message: t(meta.messageKey, n.params),
        };
      }}
    />
  );
}
