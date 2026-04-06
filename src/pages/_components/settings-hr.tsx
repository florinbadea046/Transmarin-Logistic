import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const HR_STORAGE_KEY = "transmarin_hr_module_settings";

interface HRModuleSettings {
  annualLeaveDays: number;
  workScheduleHours: number;
  fiscalYearStartMonth: number;
  probationDays: number;
  autoApproveLeaveDays: number;
}

const DEFAULT_HR_SETTINGS: HRModuleSettings = {
  annualLeaveDays: 21,
  workScheduleHours: 8,
  fiscalYearStartMonth: 1,
  probationDays: 90,
  autoApproveLeaveDays: 0,
};

function getHRSettings(): HRModuleSettings {
  try {
    const raw = localStorage.getItem(HR_STORAGE_KEY);
    if (!raw) return DEFAULT_HR_SETTINGS;
    return { ...DEFAULT_HR_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_HR_SETTINGS;
  }
}

function saveHRSettings(s: HRModuleSettings): void {
  localStorage.setItem(HR_STORAGE_KEY, JSON.stringify(s));
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const SCHEDULE_OPTIONS = [8, 10, 12];

export function SettingsHR() {
  const { t } = useTranslation();
  const [settings, setSettings] = React.useState<HRModuleSettings>(getHRSettings);

  function update<K extends keyof HRModuleSettings>(key: K, value: HRModuleSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    saveHRSettings(settings);
    toast.success(t("settings.hr.saved"));
  }

  function handleReset() {
    setSettings(DEFAULT_HR_SETTINGS);
    saveHRSettings(DEFAULT_HR_SETTINGS);
    toast.success(t("settings.hr.reset"));
  }

  return (
    <div className="grid gap-4 max-w-2xl">
      {/* Annual leave days */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>{t("settings.hr.annualLeaveTitle")}</CardTitle>
            <Badge variant="outline">{t("settings.hr.adminOnly")}</Badge>
          </div>
          <CardDescription>{t("settings.hr.annualLeaveDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <Label htmlFor="annualLeaveDays">{t("settings.hr.annualLeaveDays")}</Label>
            <div className="flex items-center gap-3">
              <Input
                id="annualLeaveDays"
                type="number"
                min={0}
                max={365}
                className="w-28"
                value={settings.annualLeaveDays}
                onChange={(e) => update("annualLeaveDays", Math.max(0, Number(e.target.value)))}
              />
              <span className="text-sm text-muted-foreground">{t("settings.hr.daysPerYear")}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work schedule */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.hr.workScheduleTitle")}</CardTitle>
          <CardDescription>{t("settings.hr.workScheduleDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <Label>{t("settings.hr.workScheduleHours")}</Label>
            <Select
              value={String(settings.workScheduleHours)}
              onValueChange={(v) => update("workScheduleHours", Number(v))}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCHEDULE_OPTIONS.map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {h}h
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Fiscal year start month */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.hr.fiscalYearTitle")}</CardTitle>
          <CardDescription>{t("settings.hr.fiscalYearDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <Label>{t("settings.hr.fiscalYearStartMonth")}</Label>
            <Select
              value={String(settings.fiscalYearStartMonth)}
              onValueChange={(v) => update("fiscalYearStartMonth", Number(v))}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {t(`settings.hr.months.${m}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Probation period */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.hr.probationTitle")}</CardTitle>
          <CardDescription>{t("settings.hr.probationDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <Label htmlFor="probationDays">{t("settings.hr.probationDays")}</Label>
            <div className="flex items-center gap-3">
              <Input
                id="probationDays"
                type="number"
                min={0}
                max={365}
                className="w-28"
                value={settings.probationDays}
                onChange={(e) => update("probationDays", Math.max(0, Number(e.target.value)))}
              />
              <span className="text-sm text-muted-foreground">{t("settings.hr.days")}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-approve leave */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>{t("settings.hr.autoApproveTitle")}</CardTitle>
            <Badge variant="outline">{t("settings.hr.adminOnly")}</Badge>
          </div>
          <CardDescription>{t("settings.hr.autoApproveDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <Label htmlFor="autoApproveDays">{t("settings.hr.autoApproveDays")}</Label>
            <div className="flex items-center gap-3">
              <Input
                id="autoApproveDays"
                type="number"
                min={0}
                max={365}
                className="w-28"
                value={settings.autoApproveLeaveDays}
                onChange={(e) => update("autoApproveLeaveDays", Math.max(0, Number(e.target.value)))}
              />
              <span className="text-sm text-muted-foreground">{t("settings.hr.days")}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t("settings.hr.autoApproveHint")}</p>
          </div>
        </CardContent>
      </Card>

      {/* Save / Reset */}
      <div className="flex items-center gap-3 justify-end">
        <Button variant="outline" onClick={handleReset}>
          {t("settings.hr.resetBtn")}
        </Button>
        <Button onClick={handleSave}>
          {t("settings.hr.saveBtn")}
        </Button>
      </div>
    </div>
  );
}
