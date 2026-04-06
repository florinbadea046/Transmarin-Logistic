import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Truck,
  IdCard,
  Clock,
  Package,
  CalendarDays,
  FileText,
  Volume2,
} from "lucide-react";
import { useAuth } from "@/context/auth-provider";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NOTIFICATION_STORAGE_KEY = "transmarin_notification_settings";

interface NotificationSettings {
  enabled: boolean;
  truckDocuments: boolean;
  driverLicenses: boolean;
  delayedTrips: boolean;
  unassignedOrders: boolean;
  pendingLeave: boolean;
  employeeDocuments: boolean;
  alertDaysBefore: number;
  sound: boolean;
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  truckDocuments: true,
  driverLicenses: true,
  delayedTrips: true,
  unassignedOrders: true,
  pendingLeave: true,
  employeeDocuments: true,
  alertDaysBefore: 14,
  sound: true,
};

function getNotificationSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_SETTINGS;
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

function saveNotificationSettings(s: NotificationSettings): void {
  localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(s));
}

const categories = [
  {
    key: "truckDocuments" as const,
    icon: Truck,
    labelKey: "settings.notifications.truckDocuments",
    hintKey: "settings.notifications.truckDocumentsHint",
    module: "transport",
  },
  {
    key: "driverLicenses" as const,
    icon: IdCard,
    labelKey: "settings.notifications.driverLicenses",
    hintKey: "settings.notifications.driverLicensesHint",
    module: "transport",
  },
  {
    key: "delayedTrips" as const,
    icon: Clock,
    labelKey: "settings.notifications.delayedTrips",
    hintKey: "settings.notifications.delayedTripsHint",
    module: "transport",
  },
  {
    key: "unassignedOrders" as const,
    icon: Package,
    labelKey: "settings.notifications.unassignedOrders",
    hintKey: "settings.notifications.unassignedOrdersHint",
    module: "transport",
  },
  {
    key: "pendingLeave" as const,
    icon: CalendarDays,
    labelKey: "settings.notifications.pendingLeave",
    hintKey: "settings.notifications.pendingLeaveHint",
    module: "hr",
  },
  {
    key: "employeeDocuments" as const,
    icon: FileText,
    labelKey: "settings.notifications.employeeDocuments",
    hintKey: "settings.notifications.employeeDocumentsHint",
    module: "hr",
  },
];

export function SettingsNotifications() {
  const { t } = useTranslation();
  const { hasAccess } = useAuth();
  const [settings, setSettings] = React.useState<NotificationSettings>(
    getNotificationSettings,
  );

  const visibleCategories = categories.filter((c) => hasAccess(c.module));

  function update<K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K],
  ) {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      saveNotificationSettings(next);
      return next;
    });
    toast.success(t("settings.notifications.saved"));
  }

  return (
    <div className="grid gap-4 max-w-2xl">
      {/* Master toggle */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.notifications.title")}</CardTitle>
          <CardDescription>{t("settings.notifications.desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label>{t("settings.notifications.masterToggle")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("settings.notifications.masterToggleHint")}
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(v) => update("enabled", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Per-category toggles */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.notifications.categoriesTitle")}</CardTitle>
          <CardDescription>
            {t("settings.notifications.categoriesDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {visibleCategories.map(({ key, icon: Icon, labelKey, hintKey }) => (
            <div
              key={key}
              className="flex items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                <div className="space-y-0.5">
                  <Label>{t(labelKey)}</Label>
                  <p className="text-xs text-muted-foreground">{t(hintKey)}</p>
                </div>
              </div>
              <Switch
                checked={settings[key]}
                onCheckedChange={(v) => update(key, v)}
                disabled={!settings.enabled}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Alert days */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.notifications.alertDaysTitle")}</CardTitle>
          <CardDescription>
            {t("settings.notifications.alertDaysDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <Label>{t("settings.notifications.alertDays")}</Label>
            <div className="flex items-center gap-2">
              <Select
                value={String(settings.alertDaysBefore)}
                onValueChange={(v) => update("alertDaysBefore", Number(v))}
                disabled={!settings.enabled}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[7, 14, 30].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                {t("settings.notifications.days")}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sound */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.notifications.soundTitle")}</CardTitle>
          <CardDescription>
            {t("settings.notifications.soundDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Volume2 className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
              <div className="space-y-0.5">
                <Label>{t("settings.notifications.soundToggle")}</Label>
                <p className="text-xs text-muted-foreground">
                  {t("settings.notifications.soundToggleHint")}
                </p>
              </div>
            </div>
            <Switch
              checked={settings.sound}
              onCheckedChange={(v) => update("sound", v)}
              disabled={!settings.enabled}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
