// NotificationsCenter — bell pentru zona Transport. Genereaza notificari pentru
// documente camioane/soferi care expira, curse intarziate si comenzi neasignate.
// UI-ul delegat la NotificationCenter partajat; aici doar logica de domeniu.

import { useEffect, useMemo, useState } from "react";
import { Clock, FileWarning, PackageOpen } from "lucide-react";
import { differenceInHours, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import { formatDate } from "@/utils/format";
import type { Driver, Truck, Order, Trip } from "@/modules/transport/types";
import type { AppNotification } from "@/modules/notifications/notification.types";
import { NotificationCenter } from "./notification-center";

const DOC_ALERT_DAYS = 30;
const UNASSIGNED_ORDER_HOURS = 48;
const READ_KEY = `${STORAGE_KEYS.notifications}_read`;

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function generateNotifications(t: TFunction): AppNotification[] {
  const notifications: AppNotification[] = [];
  const now = new Date();

  // Documente soferi
  const drivers = getCollection<Driver>(STORAGE_KEYS.drivers);
  for (const driver of drivers) {
    const days = daysUntil(driver.licenseExpiry);
    if (days <= DOC_ALERT_DAYS) {
      const expired = days <= 0;
      const date = formatDate(driver.licenseExpiry);
      notifications.push({
        id: `doc-driver-${driver.id}`,
        type: "document_expiry",
        title: expired
          ? t("notifications.types.licenseExpired")
          : t("notifications.types.licenseExpiring"),
        message: expired
          ? t("notifications.types.licenseExpiredMsg", { name: driver.name, date })
          : t("notifications.types.licenseExpiringMsg", { name: driver.name, days, plural: days === 1 ? "" : "le", date }),
        createdAt: now.toISOString(),
        read: false,
        entityId: driver.id,
      });
    }
  }

  // Documente camioane
  const trucks = getCollection<Truck>(STORAGE_KEYS.trucks);
  for (const truck of trucks) {
    const checks = [
      { key: "itp", label: "ITP", date: truck.itpExpiry },
      { key: "rca", label: "RCA", date: truck.rcaExpiry },
      { key: "vignette", label: "Vigneta", date: truck.vignetteExpiry },
    ];
    for (const check of checks) {
      const days = daysUntil(check.date);
      if (days > DOC_ALERT_DAYS) continue;
      const expired = days <= 0;
      const formattedDate = formatDate(check.date);
      notifications.push({
        id: `doc-truck-${truck.id}-${check.key}`,
        type: "document_expiry",
        title: expired
          ? t("notifications.types.docExpired", { label: check.label, plate: truck.plateNumber })
          : t("notifications.types.docExpiring", { label: check.label, plate: truck.plateNumber }),
        message: expired
          ? t("notifications.types.docExpiredMsg", { plate: truck.plateNumber, label: check.label, date: formattedDate })
          : t("notifications.types.docExpiringMsg", { plate: truck.plateNumber, label: check.label, days, plural: days === 1 ? "" : "le", date: formattedDate }),
        createdAt: now.toISOString(),
        read: false,
        entityId: truck.id,
      });
    }
  }

  // Curse intarziate
  const trips = getCollection<Trip>(STORAGE_KEYS.trips);
  for (const trip of trips) {
    if (trip.status !== "in_desfasurare" || !trip.estimatedArrivalDate) continue;
    const days = daysUntil(trip.estimatedArrivalDate);
    if (days >= 0) continue;
    const overdueDays = Math.abs(days);
    notifications.push({
      id: `trip-delayed-${trip.id}`,
      type: "delayed_trip",
      title: t("notifications.types.delayedTrip"),
      message: t("notifications.types.delayedTripMsg", {
        id: trip.id,
        days: overdueDays,
        plural: overdueDays === 1 ? "" : "le",
        date: formatDate(trip.estimatedArrivalDate),
      }),
      createdAt: now.toISOString(),
      read: false,
      entityId: trip.id,
    });
  }

  // Comenzi neasignate > 48h
  const orders = getCollection<Order>(STORAGE_KEYS.orders);
  for (const order of orders) {
    if (order.status !== "pending") continue;
    const hoursElapsed = differenceInHours(now, parseISO(order.date));
    if (hoursElapsed <= UNASSIGNED_ORDER_HOURS) continue;
    const days = Math.floor(hoursElapsed / 24);
    notifications.push({
      id: `order-unassigned-${order.id}`,
      type: "unassigned_order",
      title: t("notifications.types.unassignedOrder"),
      message: t("notifications.types.unassignedOrderMsg", {
        client: order.clientName,
        origin: order.origin,
        destination: order.destination,
        days,
        plural: days === 1 ? "" : "le",
      }),
      createdAt: now.toISOString(),
      read: false,
      entityId: order.id,
    });
  }

  return notifications;
}

function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
}

export function NotificationsCenter() {
  const { t } = useTranslation();
  const [readIds, setReadIds] = useState<Set<string>>(loadReadIds);

  const notifications = useMemo(
    () => generateNotifications(t).map((n) => ({ ...n, read: readIds.has(n.id) })),
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
        title: t("notifications.title"),
        empty: t("notifications.empty"),
        markAllRead: t("notifications.markAllRead"),
        markRead: t("notifications.markRead"),
        newBadge: (count) => t("notifications.newBadge", { count }),
        total: (count) => t("notifications.total", { count }),
      }}
      notifications={notifications}
      onMarkAsRead={markAsRead}
      onMarkAllAsRead={markAllAsRead}
      renderItem={(n) => ({
        icon:
          n.type === "document_expiry" ? <FileWarning className="h-4 w-4 text-yellow-500" /> :
          n.type === "delayed_trip" ? <Clock className="h-4 w-4 text-red-500" /> :
          <PackageOpen className="h-4 w-4 text-blue-500" />,
        title: n.title,
        message: n.message,
      })}
    />
  );
}
