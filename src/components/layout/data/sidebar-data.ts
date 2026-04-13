import { LayoutDashboard, Truck, Wrench, Receipt, Users, BarChart3, Package, FileText, Calendar, Fuel, ClipboardList, UserCog, Wallet, TrendingUp, PieChart, Settings, Bell, Palette, Monitor, DollarSign, History, CalendarDays } from "lucide-react";
import { type SidebarData } from "../types";

export const sidebarData: SidebarData = {
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
      title: "General",
      items: [
        {
          title: "Dashboard",
          url: "/",
          icon: LayoutDashboard,
        },
        {
          title: "Costs & Profitability",
          url: "/costs",
          icon: DollarSign,
        },
        {
          title: "Comparatie Performanta Flota",
          url: "/fleet-comparison",
          icon: BarChart3,
        },
        {
          title: "Istoric Activitati",
          url: "/activity-log",
          icon: History,
        },
      ],
    },
    {
      title: "Module",
      items: [
        {
          title: "Transport & Dispecerat",
          icon: Truck,
          items: [
            {
              title: "Prezentare Generala",
              url: "/transport",
              icon: ClipboardList,
            },
            {
              title: "Comenzi",
              url: "/transport/orders",
              icon: FileText,
            },
            {
              title: "Curse Zilnice",
              url: "/transport/trips",
              icon: Calendar,
            },
            {
              title: "Comparatie Flota",
              url: "/transport/fleet-comparison",
              icon: BarChart3,
            },
            {
              title: "Soferi & Camioane",
              url: "/transport/drivers",
              icon: Users,
            },
            {
              title: "Analiza Soferi",
              url: "/driver-performance",
              icon: TrendingUp,
            },
            {
              title: "Mentenanta Camioane",
              url: "/transport/maintenance",
              icon: Wrench,
            },
            {
              title: "Combustibil",
              url: "/transport/fuel-log",
              icon: Fuel,
            },
            { title: "Cheltuieli Recurente", url: "/transport/recurring-expenses", icon: Receipt },
          ],
        },
        {
          title: "Parc Auto & Service",
          icon: Wrench,
          items: [
            {
              title: "Prezentare Generala",
              url: "/fleet",
              icon: Truck,
            },
            {
              title: "Piese & Consumabile",
              url: "/fleet/parts",
              icon: Package,
            },
            {
              title: "Service & Reparatii",
              url: "/fleet/service",
              icon: Wrench,
            },
            {
              title: "Combustibil",
              url: "/fleet/fuel",
              icon: Fuel,
            },
            {
              title: "Fisa Vehicul",
              url: "/fleet/vehicles",
              icon: FileText,
            },
          ],
        },
        {
          title: "Contabilitate",
          icon: Receipt,
          items: [
            {
              title: "Prezentare Generala",
              url: "/accounting",
              icon: Receipt,
            },
            {
              title: "Facturi",
              url: "/accounting/invoices",
              icon: FileText,
            },
            {
              title: "Furnizori",
              url: "/accounting/suppliers",
              icon: Users,
            },
            {
              title: "Buget & Planificare",
              url: "/accounting/budget",
              icon: Wallet,
            },
          ],
        },
        {
          title: "Resurse Umane",
          icon: UserCog,
          items: [
            {
              title: "Prezentare Generala",
              url: "/hr",
              icon: Users,
            },
            {
              title: "Angajati",
              url: "/hr/employees",
              icon: UserCog,
            },
            {
              title: "Concedii",
              url: "/hr/leaves",
              icon: Calendar,
            },
            {
              title: "Salarizare",
              url: "/hr/payroll",
              icon: Wallet,
            },
            {
              title: "Pontaj Lunar",
              url: "/hr/attendance",
              icon: CalendarDays,
            },
            {
              title: "Istoric",
              url: "/hr/activity-log",
              icon: History,
            },
          ],
        },
        {
          title: "Rapoarte",
          icon: BarChart3,
          items: [
            {
              title: "Dashboard Rapoarte",
              url: "/reports",
              icon: PieChart,
            },
            {
              title: "Rapoarte Transport",
              url: "/reports/transport",
              icon: TrendingUp,
            },
            {
              title: "Rapoarte Financiare",
              url: "/reports/financial",
              icon: Receipt,
            },
            {
              title: "Rapoarte Parc Auto",
              url: "/reports/fleet",
              icon: Wrench,
            },
            {
              title: "Rapoarte Avansate",
              url: "/reports/advanced",
              icon: BarChart3,
            },
            {
              title: "Rapoarte HR",
              url: "/reports/hr",
              icon: Users,
            },
          ],
        },
      ],
    },
    {
      title: "Setari",
      items: [
        {
          title: "Setari",
          icon: Settings,
          items: [
            {
              title: "Profil",
              url: "/settings",
              icon: UserCog,
            },
            {
              title: "Aparenta",
              url: "/settings/appearance",
              icon: Palette,
            },
            {
              title: "Notificari",
              url: "/settings/notifications",
              icon: Bell,
            },
            {
              title: "Afisare",
              url: "/settings/display",
              icon: Monitor,
            },
          ],
        },
      ],
    },
  ],
};
