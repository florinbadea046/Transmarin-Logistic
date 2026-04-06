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

const INVOICING_STORAGE_KEY = "transmarin_invoicing_settings";

interface InvoicingSettings {
  companyName: string;
  companyCUI: string;
  companyAddress: string;
  companyBankName: string;
  companyIBAN: string;
  defaultVATRate: number;
  invoicePrefix: string;
  nextInvoiceNumber: number;
}

const DEFAULT_INVOICING_SETTINGS: InvoicingSettings = {
  companyName: "Transmarin Logistic SRL",
  companyCUI: "RO12345678",
  companyAddress: "",
  companyBankName: "Banca Transilvania",
  companyIBAN: "",
  defaultVATRate: 19,
  invoicePrefix: "TML",
  nextInvoiceNumber: 1,
};

function getInvoicingSettings(): InvoicingSettings {
  try {
    const raw = localStorage.getItem(INVOICING_STORAGE_KEY);
    if (!raw) return DEFAULT_INVOICING_SETTINGS;
    return { ...DEFAULT_INVOICING_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_INVOICING_SETTINGS;
  }
}

function saveInvoicingSettings(s: InvoicingSettings): void {
  localStorage.setItem(INVOICING_STORAGE_KEY, JSON.stringify(s));
}

export function SettingsInvoicing() {
  const { t } = useTranslation();
  const [settings, setSettings] = React.useState<InvoicingSettings>(getInvoicingSettings);

  function update<K extends keyof InvoicingSettings>(key: K, value: InvoicingSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    saveInvoicingSettings(settings);
    toast.success(t("settings.invoicing.saved"));
  }

  function handleReset() {
    setSettings(DEFAULT_INVOICING_SETTINGS);
    saveInvoicingSettings(DEFAULT_INVOICING_SETTINGS);
    toast.success(t("settings.invoicing.reset"));
  }

  return (
    <div className="grid gap-4 max-w-2xl">
      {/* Company information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>{t("settings.invoicing.companyTitle")}</CardTitle>
            <Badge variant="outline">{t("settings.invoicing.adminOnly")}</Badge>
          </div>
          <CardDescription>{t("settings.invoicing.companyDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="companyName">{t("settings.invoicing.companyName")}</Label>
            <Input
              id="companyName"
              value={settings.companyName}
              onChange={(e) => update("companyName", e.target.value)}
              placeholder={t("settings.invoicing.companyNamePlaceholder")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="companyCUI">{t("settings.invoicing.companyCUI")}</Label>
            <Input
              id="companyCUI"
              value={settings.companyCUI}
              onChange={(e) => update("companyCUI", e.target.value)}
              placeholder={t("settings.invoicing.companyCUIPlaceholder")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="companyAddress">{t("settings.invoicing.companyAddress")}</Label>
            <Input
              id="companyAddress"
              value={settings.companyAddress}
              onChange={(e) => update("companyAddress", e.target.value)}
              placeholder={t("settings.invoicing.companyAddressPlaceholder")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bank details */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.invoicing.bankTitle")}</CardTitle>
          <CardDescription>{t("settings.invoicing.bankDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="bankName">{t("settings.invoicing.bankName")}</Label>
            <Input
              id="bankName"
              value={settings.companyBankName}
              onChange={(e) => update("companyBankName", e.target.value)}
              placeholder={t("settings.invoicing.bankNamePlaceholder")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="iban">{t("settings.invoicing.iban")}</Label>
            <Input
              id="iban"
              value={settings.companyIBAN}
              onChange={(e) => update("companyIBAN", e.target.value)}
              placeholder={t("settings.invoicing.ibanPlaceholder")}
              className="font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Invoice settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>{t("settings.invoicing.invoiceTitle")}</CardTitle>
            <Badge variant="outline">{t("settings.invoicing.adminOnly")}</Badge>
          </div>
          <CardDescription>{t("settings.invoicing.invoiceDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="vatRate">{t("settings.invoicing.vatRate")}</Label>
            <div className="flex items-center gap-3">
              <Input
                id="vatRate"
                type="number"
                min={0}
                max={100}
                className="w-28"
                value={settings.defaultVATRate}
                onChange={(e) => update("defaultVATRate", Math.max(0, Math.min(100, Number(e.target.value))))}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="invoicePrefix">{t("settings.invoicing.invoicePrefix")}</Label>
            <Input
              id="invoicePrefix"
              value={settings.invoicePrefix}
              onChange={(e) => update("invoicePrefix", e.target.value)}
              placeholder={t("settings.invoicing.invoicePrefixPlaceholder")}
              className="w-40"
            />
            <p className="text-xs text-muted-foreground">{t("settings.invoicing.invoicePrefixHint")}</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nextInvoiceNumber">{t("settings.invoicing.nextInvoiceNumber")}</Label>
            <div className="flex items-center gap-3">
              <Input
                id="nextInvoiceNumber"
                type="number"
                min={1}
                className="w-28"
                value={settings.nextInvoiceNumber}
                onChange={(e) => update("nextInvoiceNumber", Math.max(1, Number(e.target.value)))}
              />
              <span className="text-sm text-muted-foreground">
                {t("settings.invoicing.previewLabel")}: {settings.invoicePrefix}-{String(settings.nextInvoiceNumber).padStart(4, "0")}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save / Reset */}
      <div className="flex items-center gap-3 justify-end">
        <Button variant="outline" onClick={handleReset}>
          {t("settings.invoicing.resetBtn")}
        </Button>
        <Button onClick={handleSave}>
          {t("settings.invoicing.saveBtn")}
        </Button>
      </div>
    </div>
  );
}
