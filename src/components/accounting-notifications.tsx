// AccountingNotificationsCenter — Bell icon + dropdown pentru zona Contabilitate.
// Genereaza notificari pentru: facturi scadente azi, restante >7 zile, buget depasit,
// plati neconfirmate >3 zile. Persistare (max 200, FIFO) in STORAGE_KEYS.accounting_notifications.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  Check,
  CheckCheck,
  Clock,
  PiggyBank,
  type LucideIcon,
} from "lucide-react";
import {
  differenceInCalendarDays,
  formatDistanceToNow,
  parseISO,
  startOfToday,
} from "date-fns";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { getCollection, setCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import { formatCurrency, formatDate, getDateLocale } from "@/utils/format";
import type { BudgetCategory, Payment } from "@/modules/accounting/types";
import { getUnifiedInvoices } from "@/modules/accounting/utils/invoices-store";
import useDialogState from "@/hooks/use-dialog-state";
import { useMobile } from "@/hooks/use-mobile";

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

// ── UI ─────────────────────────────────────────────────────

function AccountingNotificationItem({
  notification,
  onMarkAsRead,
  onNavigate,
}: {
  notification: AccountingNotification;
  onMarkAsRead: (id: string) => void;
  onNavigate: (n: AccountingNotification) => void;
}) {
  const { t } = useTranslation();
  const meta = NOTIFICATION_META[notification.type];
  const Icon = meta.icon;
  const title = t(meta.titleKey, notification.params);
  const message = t(meta.messageKey, notification.params);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onNavigate(notification)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onNavigate(notification);
        }
      }}
      className={cn(
        "flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        !notification.read ? "bg-muted/50 hover:bg-muted" : "hover:bg-muted/30",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", meta.iconClass)} />
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className={cn("text-sm leading-snug", !notification.read && "font-medium")}>
          {title}
        </p>
        <p className="text-xs text-muted-foreground leading-snug break-words">
          {message}
        </p>
        <p className="text-[10px] text-muted-foreground/70 pt-0.5">
          {formatDistanceToNow(parseISO(notification.createdAt), { addSuffix: true, locale: getDateLocale() })}
        </p>
      </div>
      {!notification.read && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onMarkAsRead(notification.id);
          }}
          aria-label={t("accountingNotifications.markRead")}
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

interface ListProps {
  notifications: AccountingNotification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onNavigate: (n: AccountingNotification) => void;
}

function AccountingNotificationsList({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onNavigate,
}: ListProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{t("accountingNotifications.title")}</span>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {t("accountingNotifications.newBadge", { count: unreadCount })}
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-muted-foreground"
            onClick={onMarkAllAsRead}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            <span>{t("accountingNotifications.markAllRead")}</span>
          </Button>
        )}
      </div>

      <Separator className="shrink-0" />

      <ScrollArea className="h-[320px]">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <Bell className="h-8 w-8 opacity-30" />
            <p className="text-sm">{t("accountingNotifications.empty")}</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((n) => (
              <AccountingNotificationItem
                key={n.id}
                notification={n}
                onMarkAsRead={onMarkAsRead}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {notifications.length > 0 && (
        <>
          <Separator className="shrink-0" />
          <div className="px-4 py-2 text-center text-xs text-muted-foreground shrink-0">
            {t("accountingNotifications.total", { count: notifications.length })}
          </div>
        </>
      )}
    </div>
  );
}

function AccountingBellButton({
  unreadCount,
  onClick,
}: {
  unreadCount: number;
  onClick?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Button
      variant="outline"
      size="icon"
      className="relative"
      aria-label={t("accountingNotifications.bellAriaLabel")}
      onClick={onClick}
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <Badge
          className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full p-0 px-1 text-[10px] leading-none"
          variant="destructive"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </Button>
  );
}

// ── Componenta principala ──────────────────────────────────

export function AccountingNotificationsCenter() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useMobile(640);
  const [open, setOpen] = useDialogState(false);
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

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

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

  const handleNavigate = useCallback((n: AccountingNotification) => {
    if (!n.read) markAsRead(n.id);
    setOpen(false);
    navigate({ to: NOTIFICATION_META[n.type].route });
  }, [markAsRead, navigate, setOpen]);

  const listProps: ListProps = {
    notifications: items,
    unreadCount,
    onMarkAsRead: markAsRead,
    onMarkAllAsRead: markAllAsRead,
    onNavigate: handleNavigate,
  };

  return (
    <>
      <AccountingBellButton unreadCount={unreadCount} onClick={() => setOpen(true)} />

      <Sheet open={isMobile && open} onOpenChange={(v) => { if (isMobile) setOpen(v); }}>
        <SheetContent side="bottom" className="p-0 rounded-t-xl max-h-[85dvh] flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>{t("accountingNotifications.title")}</SheetTitle>
          </SheetHeader>
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>
          <div className="flex-1 overflow-hidden min-h-0">
            <AccountingNotificationsList {...listProps} />
          </div>
        </SheetContent>
      </Sheet>

      <Popover open={!isMobile && open} onOpenChange={(v) => { if (!isMobile) setOpen(v); }}>
        <PopoverTrigger asChild>
          <span className="absolute" aria-hidden />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-[calc(100vw-2rem)] max-w-[380px] p-0 max-h-[480px] flex flex-col overflow-hidden"
          sideOffset={8}
        >
          <AccountingNotificationsList {...listProps} />
        </PopoverContent>
      </Popover>
    </>
  );
}
