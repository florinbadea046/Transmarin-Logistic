// ──────────────────────────────────────────────────────────
// NotificationsCenter — Bell icon cu badge + dropdown
// Pe mobile (< 640px) → Sheet din jos
// Pe desktop → Popover dropdown
// Generează automat notificări pentru:
//   • Documente expirate / care expiră în ≤30 zile
//   • Curse întârziate (estimatedArrivalDate < azi și status in_desfasurare)
//   • Comenzi neasignate >48h
// ──────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import { Bell, Check, CheckCheck, FileWarning, Clock, PackageOpen } from "lucide-react";
import { formatDistanceToNow, parseISO, differenceInHours } from "date-fns";
import { ro } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Driver, Truck, Order, Trip } from "@/modules/transport/types";
import type { AppNotification } from "@/modules/notifications/notification.types";
import useDialogState from "@/hooks/use-dialog-state";
import { useMobile } from "@/hooks/use-mobile";

// ── Helpers ────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDateRO(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("ro-RO");
}

// ── Generare notificări ────────────────────────────────────

function generateNotifications(): AppNotification[] {
  const notifications: AppNotification[] = [];
  const now = new Date();

  // 1. Documente șoferi — permis
  const drivers = getCollection<Driver>(STORAGE_KEYS.drivers);
  for (const driver of drivers) {
    const days = daysUntil(driver.licenseExpiry);
    if (days <= 30) {
      notifications.push({
        id: `doc-driver-${driver.id}`,
        type: "document_expiry",
        title: days <= 0 ? "Permis EXPIRAT" : "Permis expiră curând",
        message:
          days <= 0
            ? `${driver.name} — permisul a expirat pe ${formatDateRO(driver.licenseExpiry)}.`
            : `${driver.name} — permisul expiră în ${days} zi${days === 1 ? "" : "le"} (${formatDateRO(driver.licenseExpiry)}).`,
        createdAt: now.toISOString(),
        read: false,
        entityId: driver.id,
      });
    }
  }

  // 2. Documente camioane — ITP, RCA, Vignetă
  const trucks = getCollection<Truck>(STORAGE_KEYS.trucks);
  for (const truck of trucks) {
    const checks: { key: string; label: string; date: string }[] = [
      { key: "itp", label: "ITP", date: truck.itpExpiry },
      { key: "rca", label: "RCA", date: truck.rcaExpiry },
      { key: "vignette", label: "Vignetă", date: truck.vignetteExpiry },
    ];
    for (const check of checks) {
      const days = daysUntil(check.date);
      if (days <= 30) {
        notifications.push({
          id: `doc-truck-${truck.id}-${check.key}`,
          type: "document_expiry",
          title:
            days <= 0
              ? `${check.label} EXPIRAT — ${truck.plateNumber}`
              : `${check.label} expiră curând — ${truck.plateNumber}`,
          message:
            days <= 0
              ? `${truck.plateNumber}: ${check.label} a expirat pe ${formatDateRO(check.date)}.`
              : `${truck.plateNumber}: ${check.label} expiră în ${days} zi${days === 1 ? "" : "le"} (${formatDateRO(check.date)}).`,
          createdAt: now.toISOString(),
          read: false,
          entityId: truck.id,
        });
      }
    }
  }

  // 3. Curse întârziate
  const trips = getCollection<Trip>(STORAGE_KEYS.trips);
  for (const trip of trips) {
    if (
      trip.status === "in_desfasurare" &&
      trip.estimatedArrivalDate &&
      daysUntil(trip.estimatedArrivalDate) < 0
    ) {
      const overdueDays = Math.abs(daysUntil(trip.estimatedArrivalDate));
      notifications.push({
        id: `trip-delayed-${trip.id}`,
        type: "delayed_trip",
        title: "Cursă întârziată",
        message: `Cursa ${trip.id} a depășit data estimată de sosire cu ${overdueDays} zi${overdueDays === 1 ? "" : "le"} (${formatDateRO(trip.estimatedArrivalDate)}).`,
        createdAt: now.toISOString(),
        read: false,
        entityId: trip.id,
      });
    }
  }

  // 4. Comenzi neasignate >48h
  const orders = getCollection<Order>(STORAGE_KEYS.orders);
  for (const order of orders) {
    if (order.status === "pending") {
      const orderDate = parseISO(order.date);
      const hoursElapsed = differenceInHours(now, orderDate);
      if (hoursElapsed > 48) {
        notifications.push({
          id: `order-unassigned-${order.id}`,
          type: "unassigned_order",
          title: "Comandă neasignată",
          message: `Comanda pentru ${order.clientName} (${order.origin} → ${order.destination}) este neasignată de ${Math.floor(hoursElapsed / 24)} zi${Math.floor(hoursElapsed / 24) === 1 ? "" : "le"}.`,
          createdAt: now.toISOString(),
          read: false,
          entityId: order.id,
        });
      }
    }
  }

  return notifications;
}

// ── Persistare ─────────────────────────────────────────────

const NOTIFICATIONS_KEY = STORAGE_KEYS.notifications;

function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(`${NOTIFICATIONS_KEY}_read`);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  localStorage.setItem(`${NOTIFICATIONS_KEY}_read`, JSON.stringify([...ids]));
}

// ── Icoane per tip ─────────────────────────────────────────

function NotificationIcon({ type }: { type: AppNotification["type"] }) {
  if (type === "document_expiry")
    return <FileWarning className="h-4 w-4 shrink-0 text-yellow-500" />;
  if (type === "delayed_trip")
    return <Clock className="h-4 w-4 shrink-0 text-red-500" />;
  return <PackageOpen className="h-4 w-4 shrink-0 text-blue-500" />;
}

// ── Lista notificări (shared între Popover și Sheet) ───────

function NotificationsList({
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
      {/* Header — fix, nu scrollează */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Notificări</span>
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

      {/* Lista — scrollabilă */}
      <ScrollArea className="h-[320px]">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <Bell className="h-8 w-8 opacity-30" />
            <p className="text-sm">Nicio notificare</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 transition-colors",
                  !notification.read
                    ? "bg-muted/50 hover:bg-muted"
                    : "hover:bg-muted/30",
                )}
              >
                <div className="mt-0.5">
                  <NotificationIcon type={notification.type} />
                </div>
                <div className="flex-1 space-y-0.5 min-w-0">
                  <p
                    className={cn(
                      "text-sm leading-snug",
                      !notification.read && "font-medium",
                    )}
                  >
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

      {/* Footer — fix, nu scrollează */}
      {notifications.length > 0 && (
        <>
          <Separator className="shrink-0" />
          <div className="px-4 py-2 text-center text-xs text-muted-foreground shrink-0">
            {notifications.length} notificări totale
          </div>
        </>
      )}
    </div>
  );
}

// ── Bell Button ────────────────────────────────────────────

function BellButton({
  unreadCount,
  onClick,
}: {
  unreadCount: number;
  onClick?: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="icon"
      className="relative"
      aria-label="Notificări"
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

// ── Componentă principală ──────────────────────────────────

export function NotificationsCenter() {
  const isMobile = useMobile(640);
  const [open, setOpen] = useDialogState(false);
  const [readIds, setReadIds] = useState<Set<string>>(loadReadIds);

  // Regenerăm la fiecare deschidere
  const notifications = useMemo(() => {
    return generateNotifications().map((n) => ({
      ...n,
      read: readIds.has(n.id),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, readIds]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    saveReadIds(readIds);
  }, [readIds]);

  const markAsRead = (id: string) => {
    setReadIds((prev) => new Set([...prev, id]));
  };

  const markAllAsRead = () => {
    setReadIds(new Set(notifications.map((n) => n.id)));
  };

  const listProps = {
    notifications,
    onMarkAsRead: markAsRead,
    onMarkAllAsRead: markAllAsRead,
    unreadCount,
  };

  // ── Render — un singur bell button, Popover sau Sheet în funcție de isMobile
  return (
    <>
      {/* Bell button comun */}
      <BellButton unreadCount={unreadCount} onClick={() => setOpen(true)} />

      {/* Mobile: Sheet din jos */}
      <Sheet
        open={isMobile && open}
        onOpenChange={(v) => { if (isMobile) setOpen(v); }}
      >
        <SheetContent
          side="bottom"
          className="p-0 rounded-t-xl max-h-[85dvh] flex flex-col"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Notificări</SheetTitle>
          </SheetHeader>
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>
          <div className="flex-1 overflow-hidden min-h-0">
            <NotificationsList {...listProps} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop: Popover — ancora e un span invizibil lângă bell */}
      <Popover
        open={!isMobile && open}
        onOpenChange={(v) => { if (!isMobile) setOpen(v); }}
      >
        <PopoverTrigger asChild>
          <span className="absolute" aria-hidden />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-[calc(100vw-2rem)] max-w-[380px] p-0 max-h-[480px] flex flex-col overflow-hidden"
          sideOffset={8}
        >
          <NotificationsList {...listProps} />
        </PopoverContent>
      </Popover>
    </>
  );
}