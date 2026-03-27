// HRNotificationsCenter — Bell icon HR cu badge + dropdown
// Genereaza notificari pentru: documente angajati care expira, cereri concediu in asteptare
// Pe mobile (< 640px) -> Sheet din jos
// Pe desktop -> Popover dropdown

import { useEffect, useMemo, useState } from "react";
import { Bell, Check, CheckCheck, FileWarning, CalendarClock } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ro } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Employee, LeaveRequest } from "@/modules/hr/types";
import type { AppNotification } from "@/modules/notifications/notification.types";
import useDialogState from "@/hooks/use-dialog-state";
import { useMobile } from "@/hooks/use-mobile";

// ── Helpers ────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  if (isNaN(target.getTime())) return Infinity;
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDateRO(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("ro-RO");
}

const DOC_LABELS: Record<string, string> = {
  license: "Permis de conducere",
  tachograph: "Tahograf",
  adr: "Certificat ADR",
  medical: "Aviz medical",
  contract: "Contract de muncă",
  certificate: "Certificat",
  other: "Document",
};

// ── Generare notificari HR ─────────────────────────────────

function generateHRNotifications(): AppNotification[] {
  const notifications: AppNotification[] = [];
  const now = new Date();

  const employees = getCollection<Employee>(STORAGE_KEYS.employees);
  const leaves = getCollection<LeaveRequest>(STORAGE_KEYS.leaveRequests);

  // 1. Documente angajati care expira in <= 30 zile
  for (const emp of employees) {
    for (const doc of emp.documents ?? []) {
      if (!doc.expiryDate) continue;
      const days = daysUntil(doc.expiryDate);
      if (days > 30) continue;

      const label = DOC_LABELS[doc.type] ?? DOC_LABELS.other;
      const expired = days <= 0;

      notifications.push({
        id: `hr-doc-${emp.id}-${doc.id}`,
        type: "hr_document_expiry",
        title: expired
          ? `${label} expirat — ${emp.name}`
          : `${label} expiră în curând — ${emp.name}`,
        message: expired
          ? `${label} al lui ${emp.name} a expirat pe ${formatDateRO(doc.expiryDate)}.`
          : `${label} al lui ${emp.name} expiră în ${days} ${days === 1 ? "zi" : "zile"} (${formatDateRO(doc.expiryDate)}).`,
        createdAt: now.toISOString(),
        read: false,
        entityId: emp.id,
      });
    }
  }

  // 2. Cereri de concediu in asteptare
  for (const leave of leaves) {
    if (leave.status !== "pending") continue;
    const emp = employees.find((e) => e.id === leave.employeeId);
    const empName = emp?.name ?? leave.employeeId;

    notifications.push({
      id: `hr-leave-${leave.id}`,
      type: "pending_leave",
      title: `Cerere concediu în așteptare — ${empName}`,
      message: `${empName} a solicitat ${leave.days} ${leave.days === 1 ? "zi" : "zile"} de concediu (${formatDateRO(leave.startDate)} – ${formatDateRO(leave.endDate)}).`,
      createdAt: now.toISOString(),
      read: false,
      entityId: leave.id,
    });
  }

  return notifications;
}

// ── Persistare ─────────────────────────────────────────────

const HR_NOTIFICATIONS_READ_KEY = "transmarin_hr_notifications_read";

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

// ── Icoane per tip ─────────────────────────────────────────

function HRNotificationIcon({ type }: { type: AppNotification["type"] }) {
  if (type === "hr_document_expiry")
    return <FileWarning className="h-4 w-4 shrink-0 text-yellow-500" />;
  if (type === "pending_leave")
    return <CalendarClock className="h-4 w-4 shrink-0 text-blue-500" />;
  return <Bell className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

// ── Lista notificari ───────────────────────────────────────

function HRNotificationsList({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  unreadCount,
}: {
  notifications: (AppNotification & { read: boolean })[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  unreadCount: number;
}) {
  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Notificări HR</span>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} noi
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
            <span>Marchează toate ca citite</span>
          </Button>
        )}
      </div>

      <Separator className="shrink-0" />

      <ScrollArea className="h-[320px]">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <Bell className="h-8 w-8 opacity-30" />
            <p className="text-sm">Nicio notificare HR</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 transition-colors",
                  !notification.read ? "bg-muted/50 hover:bg-muted" : "hover:bg-muted/30",
                )}
              >
                <div className="mt-0.5">
                  <HRNotificationIcon type={notification.type} />
                </div>
                <div className="flex-1 space-y-0.5 min-w-0">
                  <p className={cn("text-sm leading-snug", !notification.read && "font-medium")}>
                    {notification.title}
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug break-words">
                    {notification.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 pt-0.5">
                    {formatDistanceToNow(parseISO(notification.createdAt), {
                      addSuffix: true,
                      locale: ro,
                    })}
                  </p>
                </div>
                {!notification.read && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => onMarkAsRead(notification.id)}
                    aria-label="Marchează ca citit"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {notifications.length > 0 && (
        <>
          <Separator className="shrink-0" />
          <div className="px-4 py-2 text-center text-xs text-muted-foreground shrink-0">
            {notifications.length} {notifications.length === 1 ? "notificare" : "notificări"} total
          </div>
        </>
      )}
    </div>
  );
}

// ── Bell Button ────────────────────────────────────────────

function HRBellButton({ unreadCount, onClick }: { unreadCount: number; onClick?: () => void }) {
  return (
    <Button
      variant="outline"
      size="icon"
      className="relative"
      aria-label="Notificări HR"
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

export function HRNotificationsCenter() {
  const isMobile = useMobile(640);
  const [open, setOpen] = useDialogState(false);
  const [readIds, setReadIds] = useState<Set<string>>(loadReadIds);

  const notifications = useMemo(() => {
    return generateHRNotifications().map((n) => ({
      ...n,
      read: readIds.has(n.id),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, readIds]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    saveReadIds(readIds);
  }, [readIds]);

  const markAsRead = (id: string) => setReadIds((prev) => new Set([...prev, id]));
  const markAllAsRead = () => setReadIds(new Set(notifications.map((n) => n.id)));

  const listProps = { notifications, onMarkAsRead: markAsRead, onMarkAllAsRead: markAllAsRead, unreadCount };

  return (
    <>
      <HRBellButton unreadCount={unreadCount} onClick={() => setOpen(true)} />

      {/* Mobile: Sheet din jos */}
      <Sheet open={isMobile && open} onOpenChange={(v) => { if (isMobile) setOpen(v); }}>
        <SheetContent side="bottom" className="p-0 rounded-t-xl max-h-[85dvh] flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>Notificări HR</SheetTitle>
          </SheetHeader>
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>
          <div className="flex-1 overflow-hidden min-h-0">
            <HRNotificationsList {...listProps} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop: Popover */}
      <Popover open={!isMobile && open} onOpenChange={(v) => { if (!isMobile) setOpen(v); }}>
        <PopoverTrigger asChild>
          <span className="absolute" aria-hidden />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-[calc(100vw-2rem)] max-w-[380px] p-0 max-h-[480px] flex flex-col overflow-hidden"
          sideOffset={8}
        >
          <HRNotificationsList {...listProps} />
        </PopoverContent>
      </Popover>
    </>
  );
}
