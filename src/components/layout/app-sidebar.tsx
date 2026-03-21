import { useLayout } from "@/context/layout-provider";
import { useTranslation } from "react-i18next";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { sidebarData } from "./data/sidebar-data";
import { NavGroup } from "./nav-group";
import { NavUser } from "./nav-user";
import { TeamSwitcher } from "./team-switcher";
import type { SidebarData } from "./types";

// Mapeaza url -> cheie i18n pentru titlurile din sidebar
const TITLE_KEYS: Record<string, string> = {
  // General
  "/": "dashboard.title",
  "/costs": "costs.title",
  "/activity-log": "activityLog.title",
  // Transport
  "/transport": "sidebar.transport.overview",
  "/transport/orders": "orders.title",
  "/transport/trips": "trips.title",
  "/transport/drivers": "driversPage.title",
  "/transport/trips-map": "tripsMap.title",
  "/transport/trips-calendar": "tripsCalendar.title",
  // Fleet
  "/fleet": "sidebar.fleet.overview",
  "/fleet/parts": "sidebar.fleet.parts",
  "/fleet/service": "sidebar.fleet.service",
  "/fleet/fuel": "sidebar.fleet.fuel",
  // Accounting
  "/accounting": "sidebar.accounting.overview",
  "/accounting/invoices": "invoices.title",
  "/accounting/suppliers": "sidebar.accounting.suppliers",
  // HR
  "/hr": "sidebar.hr.overview",
  "/hr/employees": "employees.title",
  "/hr/leaves": "sidebar.hr.leaves",
  "/hr/payroll": "sidebar.hr.payroll",
  // Reports
  "/reports": "sidebar.reports.overview",
  "/reports/transport": "sidebar.reports.transport",
  "/reports/financial": "sidebar.reports.financial",
  "/reports/fleet": "sidebar.reports.fleet",
  "/reports/advanced": "reports.title",
  // Settings
  "/settings": "sidebar.settings.profile",
  "/settings/appearance": "sidebar.settings.appearance",
  "/settings/notifications": "sidebar.settings.notifications",
  "/settings/display": "sidebar.settings.display",
};

// Mapeaza titlu grup -> cheie i18n
const GROUP_KEYS: Record<string, string> = {
  "General": "sidebar.groups.general",
  "Module": "sidebar.groups.modules",
  "Setari": "sidebar.groups.settings",
};

// Mapeaza titlu item parinte -> cheie i18n
const PARENT_KEYS: Record<string, string> = {
  "Transport & Dispecerat": "sidebar.transport.title",
  "Parc Auto & Service": "sidebar.fleet.title",
  "Contabilitate": "sidebar.accounting.title",
  "Resurse Umane": "sidebar.hr.title",
  "Rapoarte": "sidebar.reports.title",
  "Setari": "sidebar.settings.title",
  "Dashboard": "dashboard.title",
  "Costs & Profitability": "costs.title",
  "Istoric Activitati": "activityLog.title",
};

export function AppSidebar() {
  const { collapsible, layout } = useLayout();
  const { t } = useTranslation();

  const variant =
    layout === "full" ? "inset" : layout === "compact" ? "floating" : "sidebar";

  // Traduce recursiv navGroups
  const translatedData: SidebarData = {
    ...sidebarData,
    navGroups: sidebarData.navGroups.map((group) => ({
      ...group,
      title: GROUP_KEYS[group.title] ? t(GROUP_KEYS[group.title]) : group.title,
      items: group.items.map((item): import("./types").NavItem => {
        const translatedTitle = PARENT_KEYS[item.title] ? t(PARENT_KEYS[item.title]) : item.title;
        if (item.items) {
          return {
            ...item,
            title: translatedTitle,
            items: item.items.map((sub) => ({
              ...sub,
              title: sub.url && TITLE_KEYS[sub.url] ? t(TITLE_KEYS[sub.url]) : sub.title,
            })),
          };
        }
        return { ...item, title: translatedTitle };
      }),
    })),
  };

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <TeamSwitcher teams={translatedData.teams} />
      </SidebarHeader>

      <SidebarContent>
        {translatedData.navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={translatedData.user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}