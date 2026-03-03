// ──────────────────────────────────────────────────────────
// Configurarea rutelor — TanStack Router
//
// Fiecare modul are un grup de rute. Studenții pot adăuga
// rute noi în fiecare modul fără a modifica acest fișier.
// ──────────────────────────────────────────────────────────

import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";

import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";

// Pages
import DashboardPage from "@/pages/dashboard";
import LoginPage from "@/pages/login";
import NotFoundPage from "@/pages/not-found";
import UnauthorizedPage from "@/pages/unauthorized";

// Transport
import TransportPage from "@/modules/transport/index";
import OrdersPage from "@/modules/transport/pages/orders";
import TripsPage from "@/modules/transport/pages/trips";
import DriversPage from "@/modules/transport/pages/drivers";

// Fleet
import FleetPage from "@/modules/fleet/index";
import PartsPage from "@/modules/fleet/pages/parts";
import ServicePage from "@/modules/fleet/pages/service";
import FuelPage from "@/modules/fleet/pages/fuel";

// Accounting
import AccountingPage from "@/modules/accounting/index";
import InvoicesPage from "@/modules/accounting/pages/invoices";
import SuppliersPage from "@/modules/accounting/pages/suppliers";

// HR
import HRPage from "@/modules/hr/index";
import EmployeesPage from "@/modules/hr/pages/employees";
import LeavesPage from "@/modules/hr/pages/leaves";
import PayrollPage from "@/modules/hr/pages/payroll";

// Reports
import ReportsPage from "@/modules/reports/index";
import TransportReportsPage from "@/modules/reports/pages/transport-reports";
import FinancialReportsPage from "@/modules/reports/pages/financial-reports";
import FleetReportsPage from "@/modules/reports/pages/fleet-reports";

// Settings
import SettingsPage from "@/pages/settings";

// ──────────────────────────────────────────────────────────
// Helper — verifică dacă utilizatorul e autentificat
// ──────────────────────────────────────────────────────────
function isAuthenticated(): boolean {
  try {
    const raw = localStorage.getItem("transmarin_auth_user");
    return !!raw;
  } catch {
    return false;
  }
}

// ──────────────────────────────────────────────────────────
// Root Route — layout-ul radăcină
// ──────────────────────────────────────────────────────────
const rootRoute = createRootRoute({
  notFoundComponent: NotFoundPage,
});

// ──────────────────────────────────────────────────────────
// Login (public)
// ──────────────────────────────────────────────────────────
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
  beforeLoad: () => {
    if (isAuthenticated()) {
      throw redirect({ to: "/" });
    }
  },
});

// ──────────────────────────────────────────────────────────
// Authenticated Layout — toate rutele protejate
// ──────────────────────────────────────────────────────────
const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "authenticated",
  component: AuthenticatedLayout,
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
  },
});

// ── Dashboard ────────────────────────────────────────────
const dashboardRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/",
  component: DashboardPage,
});

// ── Transport ────────────────────────────────────────────
const transportRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/transport",
  component: TransportPage,
});

const ordersRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/transport/orders",
  component: OrdersPage,
});

const tripsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/transport/trips",
  component: TripsPage,
});

const driversRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/transport/drivers",
  component: DriversPage,
});

// ── Fleet ────────────────────────────────────────────────
const fleetRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/fleet",
  component: FleetPage,
});

const partsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/fleet/parts",
  component: PartsPage,
});

const serviceRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/fleet/service",
  component: ServicePage,
});

const fuelRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/fleet/fuel",
  component: FuelPage,
});

// ── Accounting ───────────────────────────────────────────
const accountingRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/accounting",
  component: AccountingPage,
});

const invoicesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/accounting/invoices",
  component: InvoicesPage,
});

const suppliersRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/accounting/suppliers",
  component: SuppliersPage,
});

// ── HR ───────────────────────────────────────────────────
const hrRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/hr",
  component: HRPage,
});

const employeesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/hr/employees",
  component: EmployeesPage,
});

const leavesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/hr/leaves",
  component: LeavesPage,
});

const payrollRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/hr/payroll",
  component: PayrollPage,
});

// ── Reports ──────────────────────────────────────────────
const reportsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/reports",
  component: ReportsPage,
});

const transportReportsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/reports/transport",
  component: TransportReportsPage,
});

const financialReportsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/reports/financial",
  component: FinancialReportsPage,
});

const fleetReportsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/reports/fleet",
  component: FleetReportsPage,
});

// ── Settings ─────────────────────────────────────────────
const settingsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/settings",
  component: SettingsPage,
});

const settingsAccountRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/settings/account",
  component: SettingsPage,
});

const settingsAppearanceRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/settings/appearance",
  component: SettingsPage,
});

const settingsNotificationsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/settings/notifications",
  component: SettingsPage,
});

const settingsDisplayRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/settings/display",
  component: SettingsPage,
});

// ── Unauthorized ─────────────────────────────────────────
const unauthorizedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/unauthorized",
  component: UnauthorizedPage,
});

// ──────────────────────────────────────────────────────────
// Arborele de rute
// ──────────────────────────────────────────────────────────
const routeTree = rootRoute.addChildren([
  loginRoute,
  unauthorizedRoute,
  authenticatedRoute.addChildren([
    dashboardRoute,
    // Transport
    transportRoute,
    ordersRoute,
    tripsRoute,
    driversRoute,
    // Fleet
    fleetRoute,
    partsRoute,
    serviceRoute,
    fuelRoute,
    // Accounting
    accountingRoute,
    invoicesRoute,
    suppliersRoute,
    // HR
    hrRoute,
    employeesRoute,
    leavesRoute,
    payrollRoute,
    // Reports
    reportsRoute,
    transportReportsRoute,
    financialReportsRoute,
    fleetReportsRoute,
    // Settings
    settingsRoute,
    settingsAccountRoute,
    settingsAppearanceRoute,
    settingsNotificationsRoute,
    settingsDisplayRoute,
  ]),
]);

// ──────────────────────────────────────────────────────────
// Router export
// ──────────────────────────────────────────────────────────
export const router = createRouter({ routeTree });

// Type-safety pentru TanStack Router
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
