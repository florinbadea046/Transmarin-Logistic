import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Truck as TruckType } from "@/modules/transport/types";
import { cn } from "@/lib/utils";

// ── Transport Alerts (ITP/RCA/Vignette) ───────────────────

export function AlerteTransport({ trucks }: { trucks: TruckType[] }) {
  const { t } = useTranslation();
  const nowMs = new Date().getTime();
  const alerts: { label: string; daysLeft: number }[] = [];
  for (const truck of trucks) {
    const checks = [
      { field: truck.itpExpiry, type: "ITP" },
      { field: truck.rcaExpiry, type: "RCA" },
      { field: truck.vignetteExpiry, type: t("trucks.card.vignette") },
    ];
    for (const { field, type } of checks) {
      if (!field) continue;
      try {
        const daysLeft = Math.ceil((new Date(field).getTime() - nowMs) / 86400000);
        if (daysLeft < 30) {
          const status = daysLeft < 0
            ? t("dashboard.alerts.expired")
            : t("dashboard.alerts.expiresIn", { days: daysLeft });
          alerts.push({ label: `${truck.plateNumber} — ${type} ${status}`, daysLeft });
        }
      } catch (e) { console.warn("Failed to parse date:", e); }
    }
  }
  alerts.sort((a, b) => a.daysLeft - b.daysLeft);
  if (alerts.length === 0) return null;
  return (
    <Card className="border-yellow-200 dark:border-yellow-800">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-yellow-700 dark:text-yellow-400">
          <AlertTriangle className="h-4 w-4" />
          {t("dashboard.alerts.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5">
          {alerts.map((a, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span className={cn("h-2 w-2 rounded-full shrink-0",
                a.daysLeft < 0 ? "bg-red-500" : a.daysLeft < 7 ? "bg-orange-400" : "bg-yellow-400")} />
              <span className={a.daysLeft < 0 ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                {a.label}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
