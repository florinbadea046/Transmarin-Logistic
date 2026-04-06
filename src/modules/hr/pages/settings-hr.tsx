import * as React from "react";
import { useTranslation } from "react-i18next";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { HRSettings } from "@/modules/hr/types";

// ── Helpers ────────────────────────────────────────────────

const DEFAULT_SETTINGS: HRSettings = {
  defaultLeaveDays: 21,
  leaveTypes: ["Concediu de odihnă", "Medical", "Fără plată", "Altele"],
  documentAlertDays: 30,
  departments: ["Dispecerat", "Transport", "Service", "Contabilitate", "Administrativ"],
  documentNumberFormat: "DOC-{YYYY}-{NNN}",
  bonusCurrency: "RON",
};

function loadSettings(): HRSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.hr_settings);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(s: HRSettings): void {
  localStorage.setItem(STORAGE_KEYS.hr_settings, JSON.stringify(s));
}

// ── Page ───────────────────────────────────────────────────

export default function HRSettingsPage() {
  const { t } = useTranslation();
  const [settings, setSettings] = React.useState<HRSettings>(loadSettings);

  const [newLeaveType, setNewLeaveType] = React.useState("");
  const [newDept, setNewDept] = React.useState("");

  const handleSave = () => {
    saveSettings(settings);
    toast.success(t("hrSettings.saveSuccess"));
  };

  const addLeaveType = () => {
    const val = newLeaveType.trim();
    if (!val) return;
    if (settings.leaveTypes.map((v) => v.toLowerCase()).includes(val.toLowerCase())) {
      toast.error(t("hrSettings.leave.typeExists"));
      return;
    }
    setSettings((s) => ({ ...s, leaveTypes: [...s.leaveTypes, val] }));
    setNewLeaveType("");
  };

  const removeLeaveType = (type: string) => {
    setSettings((s) => ({ ...s, leaveTypes: s.leaveTypes.filter((v) => v !== type) }));
  };

  const addDept = () => {
    const val = newDept.trim();
    if (!val) return;
    if (settings.departments.map((v) => v.toLowerCase()).includes(val.toLowerCase())) {
      toast.error(t("hrSettings.departments.deptExists"));
      return;
    }
    setSettings((s) => ({ ...s, departments: [...s.departments, val] }));
    setNewDept("");
  };

  const removeDept = (dept: string) => {
    setSettings((s) => ({ ...s, departments: s.departments.filter((v) => v !== dept) }));
  };

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("hrSettings.title")}</h1>
      </Header>
      <Main>
        <div className="max-w-2xl space-y-6">

          {/* Concediu */}
          <Card>
            <CardHeader>
              <CardTitle>{t("hrSettings.leave.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t("hrSettings.leave.defaultDays")}</Label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  className="w-32"
                  value={settings.defaultLeaveDays}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      defaultLeaveDays: Math.max(1, parseInt(e.target.value) || 1),
                    }))
                  }
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>{t("hrSettings.leave.leaveTypes")}</Label>
                <div className="flex flex-wrap gap-2">
                  {settings.leaveTypes.map((type) => (
                    <Badge key={type} variant="secondary" className="gap-1 pr-1">
                      {type}
                      <button
                        type="button"
                        onClick={() => removeLeaveType(type)}
                        className="ml-0.5 rounded hover:text-destructive"
                        aria-label={`Remove ${type}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder={t("hrSettings.leave.typePlaceholder")}
                    value={newLeaveType}
                    onChange={(e) => setNewLeaveType(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addLeaveType()}
                    className="max-w-xs"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addLeaveType} disabled={!newLeaveType.trim()}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {t("hrSettings.leave.addType")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documente */}
          <Card>
            <CardHeader>
              <CardTitle>{t("hrSettings.documents.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t("hrSettings.documents.alertDays")}</Label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  className="w-32"
                  value={settings.documentAlertDays}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      documentAlertDays: Math.max(1, parseInt(e.target.value) || 1),
                    }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>{t("hrSettings.documents.numberFormat")}</Label>
                <Input
                  className="max-w-xs"
                  value={settings.documentNumberFormat}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, documentNumberFormat: e.target.value }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Departamente */}
          <Card>
            <CardHeader>
              <CardTitle>{t("hrSettings.departments.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {settings.departments.map((dept) => (
                  <Badge key={dept} variant="secondary" className="gap-1 pr-1">
                    {dept}
                    <button
                      type="button"
                      onClick={() => removeDept(dept)}
                      className="ml-0.5 rounded hover:text-destructive"
                      aria-label={`Remove ${dept}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder={t("hrSettings.departments.deptPlaceholder")}
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addDept()}
                  className="max-w-xs"
                />
                <Button type="button" variant="outline" size="sm" onClick={addDept} disabled={!newDept.trim()}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  {t("hrSettings.departments.addDept")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Bonusuri */}
          <Card>
            <CardHeader>
              <CardTitle>{t("hrSettings.bonuses.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                <Label>{t("hrSettings.bonuses.currency")}</Label>
                <Select
                  value={settings.bonusCurrency}
                  onValueChange={(v) =>
                    setSettings((s) => ({
                      ...s,
                      bonusCurrency: v as "RON" | "EUR",
                    }))
                  }
                >
                  <SelectTrigger className="w-32">
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

          <Button onClick={handleSave} className="w-full sm:w-auto">
            {t("hrSettings.saveButton")}
          </Button>

        </div>
      </Main>
    </>
  );
}
