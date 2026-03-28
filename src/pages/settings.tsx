import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type TransportSettings,
  DEFAULT_TRANSPORT_SETTINGS,
  getTransportSettings,
  saveTransportSettings,
} from "@/utils/transport-settings";

export default function SettingsPage() {
  const { t } = useTranslation();
  const [settings, setSettings] = React.useState<TransportSettings>(getTransportSettings);
  const [regexError, setRegexError] = React.useState<string | null>(null);

  function handleSave() {
    try {
      new RegExp(settings.plateRegex);
      setRegexError(null);
    } catch {
      setRegexError(t("settings.transport.plateRegexInvalid"));
      return;
    }
    saveTransportSettings(settings);
    toast.success(t("settings.transport.saved"));
  }

  function handleReset() {
    setSettings(DEFAULT_TRANSPORT_SETTINGS);
    saveTransportSettings(DEFAULT_TRANSPORT_SETTINGS);
    setRegexError(null);
    toast.success(t("settings.transport.reset"));
  }

  function set<K extends keyof TransportSettings>(key: K, value: TransportSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("settings.title")}</h1>
      </Header>
      <Main>
        <Tabs defaultValue="transport">
          <TabsList className="mb-4">
            <TabsTrigger value="transport">{t("settings.tabs.transport")}</TabsTrigger>
            <TabsTrigger value="profile">{t("settings.tabs.profile")}</TabsTrigger>
          </TabsList>

          <TabsContent value="transport">
            <div className="grid gap-4 max-w-2xl">

              <Card>
                <CardHeader>
                  <CardTitle>{t("settings.transport.alertsTitle")}</CardTitle>
                  <CardDescription>{t("settings.transport.alertsDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="alertDays">
                      {t("settings.transport.alertDays")}
                    </Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="alertDays"
                        type="number"
                        min={1}
                        max={365}
                        className="w-28"
                        value={settings.alertDaysBeforeExpiry}
                        onChange={(e) =>
                          set("alertDaysBeforeExpiry", Math.max(1, Number(e.target.value)))
                        }
                      />
                      <span className="text-sm text-muted-foreground">
                        {t("settings.transport.days")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("settings.transport.alertDaysHint")}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("settings.transport.plateTitle")}</CardTitle>
                  <CardDescription>{t("settings.transport.plateDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="plateRegex">
                      {t("settings.transport.plateRegex")}
                    </Label>
                    <Input
                      id="plateRegex"
                      value={settings.plateRegex}
                      onChange={(e) => {
                        set("plateRegex", e.target.value);
                        setRegexError(null);
                      }}
                      className="font-mono text-sm"
                    />
                    {regexError && (
                      <p className="text-xs text-destructive">{regexError}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {t("settings.transport.plateRegexHint")}
                    </p>
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
                        {settings.useKm
                          ? t("settings.transport.usingKm")
                          : t("settings.transport.usingMiles")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className={settings.useKm ? "text-muted-foreground" : "font-medium"}>
                        {t("settings.transport.miles")}
                      </span>
                      <Switch
                        checked={settings.useKm}
                        onCheckedChange={(v) => set("useKm", v)}
                      />
                      <span className={settings.useKm ? "font-medium" : "text-muted-foreground"}>
                        {t("settings.transport.km")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <Label>{t("settings.transport.currency")}</Label>
                      <p className="text-xs text-muted-foreground">
                        {t("settings.transport.currencyHint")}
                      </p>
                    </div>
                    <Select
                      value={settings.currency}
                      onValueChange={(v) => set("currency", v as "RON" | "EUR")}
                    >
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

              <Card>
                <CardHeader>
                  <CardTitle>{t("settings.transport.tableTitle")}</CardTitle>
                  <CardDescription>{t("settings.transport.tableDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <Label>{t("settings.transport.defaultPageSize")}</Label>
                      <p className="text-xs text-muted-foreground">
                        {t("settings.transport.defaultPageSizeHint")}
                      </p>
                    </div>
                    <Select
                      value={String(settings.defaultPageSize)}
                      onValueChange={(v) => set("defaultPageSize", Number(v))}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[5, 10, 20, 50, 100].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center gap-3 justify-end">
                <Button variant="outline" onClick={handleReset}>
                  {t("settings.transport.resetBtn")}
                </Button>
                <Button onClick={handleSave}>
                  {t("settings.transport.saveBtn")}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>{t("settings.profileTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
                {t("settings.profilePlaceholder")}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Main>
    </>
  );
}