import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/auth-provider";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SettingsProfile } from "./_components/settings-profile";
import { SettingsAppearance } from "./_components/settings-appearance";
import { SettingsNotifications } from "./_components/settings-notifications";
import { SettingsDisplay } from "./_components/settings-display";
import { SettingsHR } from "./_components/settings-hr";
import { SettingsInvoicing } from "./_components/settings-invoicing";

function pathnameToTab(pathname: string): string {
  if (pathname === "/settings/appearance") return "appearance";
  if (pathname === "/settings/notifications") return "notifications";
  if (pathname === "/settings/display") return "display";
  if (pathname === "/settings/hr") return "hr";
  if (pathname === "/settings/invoicing") return "invoicing";
  return "profile";
}

function tabToPathname(tab: string): string {
  switch (tab) {
    case "appearance": return "/settings/appearance";
    case "notifications": return "/settings/notifications";
    case "display": return "/settings/display";
    case "hr": return "/settings/hr";
    case "invoicing": return "/settings/invoicing";
    default: return "/settings";
  }
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const { hasAccess } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const activeTab = pathnameToTab(pathname);

  const tabs = [
    { value: "profile", label: t("settings.tabs.profile"), visible: true },
    { value: "appearance", label: t("settings.tabs.appearance"), visible: true },
    { value: "notifications", label: t("settings.tabs.notifications"), visible: true },
    { value: "display", label: t("settings.tabs.display"), visible: true },
    { value: "hr", label: t("settings.tabs.hr"), visible: hasAccess("hr") },
    { value: "invoicing", label: t("settings.tabs.invoicing"), visible: hasAccess("accounting") },
  ];

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("settings.title")}</h1>
      </Header>
      <Main>
        <Tabs value={activeTab} onValueChange={(v) => navigate({ to: tabToPathname(v) })}>
          <div className="mb-4 flex justify-center overflow-x-auto -mx-4 px-4">
            <TabsList className="inline-flex w-max">
              {tabs.filter((tab) => tab.visible).map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="profile">
            <SettingsProfile />
          </TabsContent>

          <TabsContent value="appearance">
            <SettingsAppearance />
          </TabsContent>

          <TabsContent value="notifications">
            <SettingsNotifications />
          </TabsContent>

          <TabsContent value="display">
            <SettingsDisplay />
          </TabsContent>

          {hasAccess("hr") && (
            <TabsContent value="hr">
              <SettingsHR />
            </TabsContent>
          )}

          {hasAccess("accounting") && (
            <TabsContent value="invoicing">
              <SettingsInvoicing />
            </TabsContent>
          )}
        </Tabs>
      </Main>
    </>
  );
}
