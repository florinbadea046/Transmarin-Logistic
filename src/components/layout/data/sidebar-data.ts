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
} from "lucide-react";
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
              title: "Prezentare Generală",
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
              title: "Șoferi & Camioane",
              url: "/transport/drivers",
              icon: Users,
            },
          ],
        },
        {
          title: "Parc Auto & Service",
          icon: Wrench,
          items: [
            {
              title: "Prezentare Generală",
              url: "/fleet",
              icon: Truck,
            },
            {
              title: "Piese & Consumabile",
              url: "/fleet/parts",
              icon: Package,
            },
            {
              title: "Service & Reparații",
              url: "/fleet/service",
              icon: Wrench,
            },
            {
              title: "Combustibil",
              url: "/fleet/fuel",
              icon: Fuel,
            },
          ],
        },
        {
          title: "Contabilitate",
          icon: Receipt,
          items: [
            {
              title: "Prezentare Generală",
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
          ],
        },
        {
          title: "Resurse Umane",
          icon: UserCog,
          items: [
            {
              title: "Prezentare Generală",
              url: "/hr",
              icon: Users,
            },
            {
              title: "Angajați",
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
          ],
        },
      ],
    },
    {
      title: "Setări",
      items: [
        {
          title: "Setări",
          icon: Settings,
          items: [
            {
              title: "Profil",
              url: "/settings",
              icon: UserCog,
            },
            {
              title: "Aparență",
              url: "/settings/appearance",
              icon: Palette,
            },
            {
              title: "Notificări",
              url: "/settings/notifications",
              icon: Bell,
            },
            {
              title: "Afișare",
              url: "/settings/display",
              icon: Monitor,
            },
          ],
        },
      ],
    },
  ],
};
