import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type Theme } from "@/context/theme-provider";
import { useLayout } from "@/context/layout-provider";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const REDUCED_MOTION_KEY = "ui_reduced_motion";

function getReducedMotion(): boolean {
  try {
    return localStorage.getItem(REDUCED_MOTION_KEY) === "true";
  } catch {
    return false;
  }
}

function applyReducedMotion(enabled: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("reduce-motion", enabled);
  localStorage.setItem(REDUCED_MOTION_KEY, String(enabled));
}

const themeOptions: { value: Theme; icon: typeof Sun; labelKey: string }[] = [
  { value: "light", icon: Sun, labelKey: "settings.appearance.light" },
  { value: "dark", icon: Moon, labelKey: "settings.appearance.dark" },
  { value: "system", icon: Monitor, labelKey: "settings.appearance.system" },
];

export function SettingsAppearance() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { fixed, setFixed } = useLayout();
  const [reducedMotion, setReducedMotion] = React.useState(getReducedMotion);

  function handleThemeChange(newTheme: Theme) {
    setTheme(newTheme);
    toast.success(t("settings.appearance.saved"));
  }

  function handleCollapsedChange(collapsed: boolean) {
    setFixed(collapsed);
    toast.success(t("settings.appearance.saved"));
  }

  function handleReducedMotionChange(enabled: boolean) {
    setReducedMotion(enabled);
    applyReducedMotion(enabled);
    toast.success(t("settings.appearance.saved"));
  }

  // Apply reduced-motion class on mount
  React.useEffect(() => {
    applyReducedMotion(reducedMotion);
  }, [reducedMotion]);

  return (
    <div className="grid gap-4 max-w-2xl mx-auto">
      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.appearance.themeTitle")}</CardTitle>
          <CardDescription>{t("settings.appearance.themeDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map(({ value, icon: Icon, labelKey }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleThemeChange(value)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors hover:bg-accent",
                  theme === value
                    ? "border-primary bg-accent"
                    : "border-muted",
                )}
              >
                <Icon className="h-6 w-6" />
                <span className="text-sm font-medium">{t(labelKey)}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sidebar collapsed */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.appearance.sidebarTitle")}</CardTitle>
          <CardDescription>
            {t("settings.appearance.sidebarDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label>{t("settings.appearance.sidebarCollapsed")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("settings.appearance.sidebarCollapsedHint")}
              </p>
            </div>
            <Switch
              checked={fixed}
              onCheckedChange={handleCollapsedChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Reduced animations */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.appearance.animationsTitle")}</CardTitle>
          <CardDescription>
            {t("settings.appearance.animationsDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label>{t("settings.appearance.reducedMotion")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("settings.appearance.reducedMotionHint")}
              </p>
            </div>
            <Switch
              checked={reducedMotion}
              onCheckedChange={handleReducedMotionChange}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
