import {
  LayoutDashboard,
  Truck,
  Wrench,
  Receipt,
  Users,
  BarChart3,
  Package,
  FileText,
  Calendar,
  Fuel,
  ClipboardList,
  UserCog,
  Wallet,
  TrendingUp,
  PieChart,
  Settings,
  Bell,
  Palette,
  Monitor,
  DollarSign,
  History,
  CalendarDays,
  Gauge,
  Briefcase,
  CreditCard,
  Activity,
  GraduationCap,
  Kanban,
} from "lucide-react";
import type { RawSidebarData } from "../types";

// Sursă unică de adevăr — titlurile sunt chei i18n; hook-ul useTranslatedSidebar
// le rezolvă la render prin useTranslation().
export const sidebarData: RawSidebarData = {
  user: {
    name: "Admin Transmarin",
    email: "admin@transmarin.ro",
    avatar: "/avatars/admin.jpg",
  },
  teams: [
    {
      name: "Transmarin Logistic",
      logo: Truck,
      plan: "ERP Transport",
    },
  ],
  navGroups: [
    {
      titleKey: "sidebar.groups.general",
      items: [
        { titleKey: "dashboard.title", url: "/", icon: LayoutDashboard },
        { titleKey: "costs.title", url: "/costs", icon: DollarSign },
        { titleKey: "activityLog.title", url: "/activity-log", icon: History },
      ],
    },
    {
      titleKey: "sidebar.groups.modules",
      items: [
        {
          titleKey: "sidebar.transport.title",
          icon: Truck,
          items: [
            { titleKey: "sidebar.transport.overview", url: "/transport", icon: ClipboardList },
            { titleKey: "orders.title", url: "/transport/orders", icon: FileText },
            { titleKey: "trips.title", url: "/transport/trips", icon: Calendar },
            { titleKey: "fleetComparison.title", url: "/transport/fleet-comparison", icon: BarChart3 },
            { titleKey: "driversPage.title", url: "/transport/drivers", icon: Users },
            { titleKey: "sidebar.transport.driverPerformance", url: "/driver-performance", icon: TrendingUp },
            { titleKey: "maintenance.title", url: "/transport/maintenance", icon: Wrench },
            { titleKey: "fuelLog.title", url: "/transport/fuel-log", icon: Fuel },
            { titleKey: "recurringExpenses.title", url: "/transport/recurring-expenses", icon: Receipt },
            { titleKey: "mileageRegistry.title", url: "/transport/mileage-registry", icon: Gauge },
            { titleKey: "dispatcherLive.title", url: "/dispatcher-live", icon: Activity },
          ],
        },
        {
          titleKey: "sidebar.fleet.title",
          icon: Wrench,
          items: [
            { titleKey: "sidebar.fleet.overview", url: "/fleet", icon: Truck },
            { titleKey: "sidebar.fleet.parts", url: "/fleet/parts", icon: Package },
            { titleKey: "sidebar.fleet.service", url: "/fleet/service", icon: Wrench },
            { titleKey: "sidebar.fleet.fuel", url: "/fleet/fuel", icon: Fuel },
            { titleKey: "sidebar.fleet.vehicles", url: "/fleet/vehicles", icon: FileText },
          ],
        },
        {
          titleKey: "sidebar.accounting.title",
          icon: Receipt,
          items: [
            { titleKey: "sidebar.accounting.overview", url: "/accounting", icon: Receipt },
            { titleKey: "invoices.title", url: "/accounting/invoices", icon: FileText },
            { titleKey: "clients.title", url: "/accounting/clients", icon: Users },
            { titleKey: "sidebar.accounting.suppliers", url: "/accounting/suppliers", icon: Users },
            { titleKey: "payments.title", url: "/accounting/payments", icon: CreditCard },
            { titleKey: "accountingJournals.title", url: "/accounting/journals", icon: FileText },
            { titleKey: "accounting.nav.activityLog", url: "/accounting/activity-log", icon: ClipboardList },
          ],
        },
        {
          titleKey: "sidebar.hr.title",
          icon: UserCog,
          items: [
            { titleKey: "sidebar.hr.overview", url: "/hr", icon: Users },
            { titleKey: "employees.title", url: "/hr/employees", icon: UserCog },
            { titleKey: "hr.nav.recruitment", url: "/hr/recruitment", icon: Kanban },
            { titleKey: "sidebar.hr.leaves", url: "/hr/leaves", icon: Calendar },
            { titleKey: "sidebar.hr.payroll", url: "/hr/payroll", icon: Wallet },
            { titleKey: "hr.nav.attendance", url: "/hr/attendance", icon: CalendarDays },
            { titleKey: "hr.nav.shifts", url: "/hr/shifts", icon: Calendar },
            { titleKey: "hr.nav.trainings", url: "/hr/trainings", icon: GraduationCap },
            { titleKey: "hr.nav.equipment", url: "/hr/equipment", icon: Package },
            { titleKey: "onboarding.title", url: "/hr/onboarding", icon: ClipboardList },
            { titleKey: "salaryAnalysis.title", url: "/hr/salary-analysis", icon: BarChart3 },
            { titleKey: "hr.selfService.title", url: "/hr/self-service", icon: UserCog },
            { titleKey: "hr.nav.activityLog", url: "/hr/activity-log", icon: History },
          ],
        },
        {
          titleKey: "sidebar.reports.title",
          icon: BarChart3,
          items: [
            { titleKey: "sidebar.reports.overview", url: "/reports", icon: PieChart },
            { titleKey: "sidebar.reports.transport", url: "/reports/transport", icon: TrendingUp },
            { titleKey: "sidebar.reports.financial", url: "/reports/financial", icon: Receipt },
            { titleKey: "sidebar.reports.fleet", url: "/reports/fleet", icon: Wrench },
            { titleKey: "reports.title", url: "/reports/advanced", icon: BarChart3 },
            { titleKey: "sidebar.reports.hr", url: "/reports/hr", icon: Users },
          ],
        },
      ],
    },
    {
      titleKey: "sidebar.groups.settings",
      items: [
        {
          titleKey: "sidebar.settings.title",
          icon: Settings,
          items: [
            { titleKey: "sidebar.settings.profile", url: "/settings", icon: UserCog },
            { titleKey: "sidebar.settings.appearance", url: "/settings/appearance", icon: Palette },
            { titleKey: "sidebar.settings.notifications", url: "/settings/notifications", icon: Bell },
            { titleKey: "sidebar.settings.display", url: "/settings/display", icon: Monitor },
            { titleKey: "sidebar.settings.hr", url: "/settings/hr", icon: Briefcase },
            { titleKey: "sidebar.settings.invoicing", url: "/settings/invoicing", icon: CreditCard },
          ],
        },
      ],
    },
  ],
};
