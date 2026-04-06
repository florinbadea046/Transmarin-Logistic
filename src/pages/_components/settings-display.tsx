import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-provider";
import { useLayout, type LayoutMode, type Collapsible } from "@/context/layout-provider";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  type TransportSettings,
  DEFAULT_TRANSPORT_SETTINGS,
  getTransportSettings,
  saveTransportSettings,
} from "@/utils/transport-settings";

const DATE_FORMAT_KEY = "ui_date_format";
type DateFormat = "DD.MM.YYYY" | "YYYY-MM-DD";

function getDateFormat(): DateFormat {
  try {
    const raw = localStorage.getItem(DATE_FORMAT_KEY);
    if (raw === "DD.MM.YYYY" || raw === "YYYY-MM-DD") return raw;
    return "DD.MM.YYYY";
  } catch {
    return "DD.MM.YYYY";
  }
}

export function SettingsDisplay() {
  const { t, i18n } = useTranslation();
  const { hasAccess } = useAuth();
  const { layout, setLayout, collapsible, setCollapsible, resetLayout } = useLayout();

  const [dateFormat, setDateFormat] = React.useState<DateFormat>(getDateFormat);

  // Transport settings
  const [transport, setTransport] = React.useState<TransportSettings>(getTransportSettings);
  const [regexError, setRegexError] = React.useState<string | null>(null);

  function setT<K extends keyof TransportSettings>(key: K, value: TransportSettings[K]) {
    setTransport((prev) => ({ ...prev, [key]: value }));
  }

  function handleSaveTransport() {
    try {
      new RegExp(transport.plateRegex);
      setRegexError(null);
    } catch {
      setRegexError(t("settings.transport.plateRegexInvalid"));
      return;
    }
    saveTransportSettings(transport);
    toast.success(t("settings.transport.saved"));
  }

  function handleLanguageChange(lng: string) {
    i18n.changeLanguage(lng);
    toast.success(t("settings.display.saved"));
  }

  function handleLayoutChange(mode: LayoutMode) {
    setLayout(mode);
    toast.success(t("settings.display.saved"));
  }

  function handleCollapsibleChange(mode: Collapsible) {
    setCollapsible(mode);
    toast.success(t("settings.display.saved"));
  }

  function handleDateFormatChange(fmt: DateFormat) {
    setDateFormat(fmt);
    localStorage.setItem(DATE_FORMAT_KEY, fmt);
    toast.success(t("settings.display.saved"));
  }

  function handleResetAll() {
    resetLayout();
    i18n.changeLanguage("ro");
    setDateFormat("DD.MM.YYYY");
    localStorage.setItem(DATE_FORMAT_KEY, "DD.MM.YYYY");
    setTransport(DEFAULT_TRANSPORT_SETTINGS);
    saveTransportSettings(DEFAULT_TRANSPORT_SETTINGS);
    setRegexError(null);
    toast.success(t("settings.display.resetDone"));
  }

  return (
    <div className="grid gap-4 max-w-2xl">
      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.display.languageTitle")}</CardTitle>
          <CardDescription>{t("settings.display.languageDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <Label>{t("settings.display.language")}</Label>
            <Select
              value={i18n.language?.startsWith("en") ? "en" : "ro"}
              onValueChange={handleLanguageChange}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ro">{t("settings.display.ro")}</SelectItem>
                <SelectItem value="en">{t("settings.display.en")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Layout mode */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.display.layoutTitle")}</CardTitle>
          <CardDescription>{t("settings.display.layoutDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label>{t("settings.display.layoutMode")}</Label>
            <Select value={layout} onValueChange={(v) => handleLayoutChange(v as LayoutMode)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">{t("settings.display.layoutDefault")}</SelectItem>
                <SelectItem value="compact">{t("settings.display.layoutCompact")}</SelectItem>
                <SelectItem value="full">{t("settings.display.layoutFull")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label>{t("settings.display.sidebarMode")}</Label>
            <Select value={collapsible} onValueChange={(v) => handleCollapsibleChange(v as Collapsible)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="icon">{t("settings.display.sidebarIcon")}</SelectItem>
                <SelectItem value="offcanvas">{t("settings.display.sidebarOffcanvas")}</SelectItem>
                <SelectItem value="none">{t("settings.display.sidebarNone")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Date format */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.display.dateFormatTitle")}</CardTitle>
          <CardDescription>{t("settings.display.dateFormatDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <Label>{t("settings.display.dateFormat")}</Label>
            <Select value={dateFormat} onValueChange={(v) => handleDateFormatChange(v as DateFormat)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DD.MM.YYYY">DD.MM.YYYY</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {hasAccess("transport") && (
        <>
          <Separator />

          {/* Transport Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.transport.alertsTitle")}</CardTitle>
              <CardDescription>{t("settings.transport.alertsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                <Label htmlFor="alertDays">{t("settings.transport.alertDays")}</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="alertDays"
                    type="number"
                    min={1}
                    max={365}
                    className="w-28"
                    value={transport.alertDaysBeforeExpiry}
                    onChange={(e) => setT("alertDaysBeforeExpiry", Math.max(1, Number(e.target.value)))}
                  />
                  <span className="text-sm text-muted-foreground">{t("settings.transport.days")}</span>
                </div>
                <p className="text-xs text-muted-foreground">{t("settings.transport.alertDaysHint")}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("settings.transport.plateTitle")}</CardTitle>
              <CardDescription>{t("settings.transport.plateDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                <Label htmlFor="plateRegex">{t("settings.transport.plateRegex")}</Label>
                <Input
                  id="plateRegex"
                  value={transport.plateRegex}
                  onChange={(e) => { setT("plateRegex", e.target.value); setRegexError(null); }}
                  className="font-mono text-sm"
                />
                {regexError && <p className="text-xs text-destructive">{regexError}</p>}
                <p className="text-xs text-muted-foreground">{t("settings.transport.plateRegexHint")}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("settings.transport.unitsTitle")}</CardTitle>
              <CardDescription>{t("settings.transport.unitsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label>{t("settings.transport.kmUnit")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {transport.useKm ? t("settings.transport.usingKm") : t("settings.transport.usingMiles")}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className={transport.useKm ? "text-muted-foreground" : "font-medium"}>{t("settings.transport.miles")}</span>
                  <Switch checked={transport.useKm} onCheckedChange={(v) => setT("useKm", v)} />
                  <span className={transport.useKm ? "font-medium" : "text-muted-foreground"}>{t("settings.transport.km")}</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label>{t("settings.transport.currency")}</Label>
                  <p className="text-xs text-muted-foreground">{t("settings.transport.currencyHint")}</p>
                </div>
                <Select value={transport.currency} onValueChange={(v) => setT("currency", v as "RON" | "EUR")}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RON">RON</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

        </>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 justify-end pt-2">
        <Button variant="outline" onClick={handleResetAll}>
          {t("settings.display.resetBtn")}
        </Button>
        {hasAccess("transport") && (
          <Button onClick={handleSaveTransport}>
            {t("settings.transport.saveBtn")}
          </Button>
        )}
      </div>
    </div>
  );
}
