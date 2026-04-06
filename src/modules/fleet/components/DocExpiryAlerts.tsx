import { useMemo } from "react";
import { STORAGE_KEYS } from "@/data/mock-data";
import { getCollection } from "@/utils/local-storage";
import type { Truck } from "@/modules/transport/types";
import type { ServiceRecord } from "@/modules/fleet/types";

const ALERT_DAYS = 30;

type DocType =
  | "ITP"
  | "RCA"
  | "Vignetă"
  | "Service ITP"
  | "Service RCA"
  | "Service Vignetă";

interface DocAlert {
  truckId: string;
  plateNumber: string;
  brand: string;
  model: string;
  docType: DocType;
  expiryDate: string;
  daysUntil: number;
}

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}

function getAlerts(
  trucks: Truck[],
  serviceRecords: ServiceRecord[],
): DocAlert[] {
  const alerts: DocAlert[] = [];

  for (const truck of trucks) {
    // Verifică documentele camionului (ITP, RCA, Vignetă)
    const docs: { type: DocType; date: string }[] = [
      { type: "ITP", date: truck.itpExpiry },
      { type: "RCA", date: truck.rcaExpiry },
      { type: "Vignetă", date: truck.vignetteExpiry },
    ];

    for (const doc of docs) {
      const daysUntil = getDaysUntil(doc.date);
      if (daysUntil <= ALERT_DAYS) {
        alerts.push({
          truckId: truck.id,
          plateNumber: truck.plateNumber,
          brand: truck.brand,
          model: truck.model,
          docType: doc.type,
          expiryDate: doc.date,
          daysUntil,
        });
      }
    }

    // Verifică nextServiceDate din serviceRecords pentru ITP, RCA, Vignetă
    const serviceDocMap: { type: ServiceRecord["type"]; label: DocType }[] = [
      { type: "itp", label: "Service ITP" },
      { type: "revision", label: "Service RCA" },
      { type: "other", label: "Service Vignetă" },
    ];

    for (const { type, label } of serviceDocMap) {
      const matchingRecords = serviceRecords
        .filter(
          (r) => r.truckId === truck.id && r.type === type && r.nextServiceDate,
        )
        .sort((a, b) =>
          (b.nextServiceDate ?? "").localeCompare(a.nextServiceDate ?? ""),
        );

      if (matchingRecords.length > 0) {
        const nextDate = matchingRecords[0].nextServiceDate!;
        const daysUntil = getDaysUntil(nextDate);
        if (daysUntil <= ALERT_DAYS) {
          alerts.push({
            truckId: truck.id,
            plateNumber: truck.plateNumber,
            brand: truck.brand,
            model: truck.model,
            docType: label,
            expiryDate: nextDate,
            daysUntil,
          });
        }
      }
    }
  }

  // Sortare după urgență: expirate primul, apoi cele mai apropiate
  return alerts.sort((a, b) => a.daysUntil - b.daysUntil);
}

function AlertRow({ alert }: { alert: DocAlert }) {
  const isExpired = alert.daysUntil < 0;
  const isUrgent = alert.daysUntil >= 0 && alert.daysUntil <= 7;

  const bgClass = isExpired
    ? "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
    : isUrgent
      ? "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800"
      : "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800";

  const textClass = isExpired
    ? "text-red-700 dark:text-red-300"
    : isUrgent
      ? "text-orange-700 dark:text-orange-300"
      : "text-yellow-700 dark:text-yellow-300";

  const icon = isExpired ? "🔴" : isUrgent ? "🟠" : "🟡";

  const daysLabel = isExpired
    ? `Expirat de ${Math.abs(alert.daysUntil)} ${Math.abs(alert.daysUntil) === 1 ? "zi" : "zile"}`
    : alert.daysUntil === 0
      ? "Expiră azi"
      : `Expiră în ${alert.daysUntil} ${alert.daysUntil === 1 ? "zi" : "zile"}`;

  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-4 py-3 ${bgClass}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <div>
          <span className={`font-semibold text-sm ${textClass}`}>
            {alert.plateNumber}
          </span>
          <span className="text-xs text-muted-foreground ml-2">
            {alert.brand} {alert.model}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className={`text-sm font-medium ${textClass}`}>
          {alert.docType}
        </span>
        <span className="text-xs text-muted-foreground">
          {alert.expiryDate}
        </span>
        <span className={`text-sm font-bold ${textClass}`}>{daysLabel}</span>
      </div>
    </div>
  );
}

export function DocExpiryAlerts() {
  const alerts = useMemo(() => {
    const trucks = getCollection<Truck>(STORAGE_KEYS.trucks);
    const serviceRecords = getCollection<ServiceRecord>(
      STORAGE_KEYS.serviceRecords,
    );
    return getAlerts(trucks, serviceRecords);
  }, []);

  if (alerts.length === 0) return null;

  const expiredCount = alerts.filter((a) => a.daysUntil < 0).length;
  const soonCount = alerts.filter((a) => a.daysUntil >= 0).length;

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">Alerte Documente</h2>
        {expiredCount > 0 && (
          <span className="rounded-full bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-xs font-bold px-2 py-0.5">
            {expiredCount} expirate
          </span>
        )}
        {soonCount > 0 && (
          <span className="rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 text-xs font-bold px-2 py-0.5">
            {soonCount} în {ALERT_DAYS} zile
          </span>
        )}
      </div>
      <div className="space-y-2">
        {alerts.map((alert, i) => (
          <AlertRow
            key={`${alert.truckId}-${alert.docType}-${i}`}
            alert={alert}
          />
        ))}
      </div>
    </div>
  );
}
