import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";

import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";

import DashboardPage from "@/pages/dashboard";
import LoginPage from "@/pages/login";
import NotFoundPage from "@/pages/not-found";
import UnauthorizedPage from "@/pages/unauthorized";
import CostsPage from "@/pages/costs";
import ActivityLogPage from "@/pages/activity-log";
import DriverPerformancePage from "@/modules/transport/pages/_components/driver-performance";

import TransportPage from "@/modules/transport/index";
import OrdersPage from "@/modules/transport/pages/orders";
import TripsPage from "@/modules/transport/pages/trips";
import TripsCalendarPage from "@/modules/transport/pages/_components/trips-calendar";
import TripsCalendarDndPage from "@/modules/transport/pages/_components/trips-calendar-dnd";
import TripsMapPage from "@/modules/transport/pages/_components/trips-map";
import TripTrackerPage from "@/modules/transport/pages/_components/trip-tracker";
import DriversPage from "@/modules/transport/pages/drivers";
import DriverProfilePage from "@/modules/transport/pages/_components/driver-profile";

import FleetPage from "@/modules/fleet/index";
import PartsPage from "@/modules/fleet/pages/parts";
import ServicePage from "@/modules/fleet/pages/service";
import FuelPage from "@/modules/fleet/pages/fuel";
import VehiclesPage from "@/modules/fleet/pages/vehicles";

import AccountingPage from "@/modules/accounting/index";
import InvoicesPage from "@/modules/accounting/pages/invoices";
import SuppliersPage from "@/modules/accounting/pages/suppliers";

import HRPage from "@/modules/hr/index";
import EmployeesPage from "@/modules/hr/pages/employees";
import LeavesPage from "@/modules/hr/pages/leaves";
import PayrollPage from "@/modules/hr/pages/payroll";

import ReportsPage from "@/modules/reports/index";
import TransportReportsPage from "@/modules/reports/pages/transport-reports";
import FinancialReportsPage from "@/modules/reports/pages/financial-reports";
import FleetReportsPage from "@/modules/reports/pages/fleet-reports";
import AdvancedReportsPage from "@/modules/reports/pages/reports";

import SettingsPage from "@/pages/settings";

function isAuthenticated(): boolean {
  try {
    const raw = localStorage.getItem("transmarin_auth_user");
    return !!raw;
  } catch {
    return false;
  }
}

const rootRoute = createRootRoute({
  notFoundComponent: NotFoundPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
  beforeLoad: () => {
    if (isAuthenticated()) throw redirect({ to: "/" });
  },
});

const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "authenticated",
  component: AuthenticatedLayout,
  beforeLoad: () => {
    if (!isAuthenticated()) throw redirect({ to: "/login" });
  },
});

const dashboardRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/",
  component: DashboardPage,
});

const costsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/costs",
  component: CostsPage,
});

const activityLogRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/activity-log",
  component: ActivityLogPage,
});

// Transport
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
const tripsMapRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/transport/trips-map",
  component: TripsMapPage,
});
const tripTrackerRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/transport/trip-tracker/$tripId",
  component: TripTrackerPage,
});
const tripsCalendarRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/transport/trips-calendar",
  component: TripsCalendarPage,
});
const tripsCalendarDndRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/transport/trips-calendar-dnd",
  component: TripsCalendarDndPage,
});
const driversRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/transport/drivers",
  component: DriversPage,
});
const driverProfileRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/transport/drivers/$driverId",
  component: DriverProfilePage,
});

// Fleet
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
const vehiclesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/fleet/vehicles",
  component: VehiclesPage,
});

// Accounting
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

// HR
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

// Reports
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
const advancedReportsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/reports/advanced",
  component: AdvancedReportsPage,
});

// Settings
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

// EXTRA (din al doilea cod)
const driverPerformanceRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/driver-performance",
  component: DriverPerformancePage,
});

const unauthorizedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/unauthorized",
  component: UnauthorizedPage,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  unauthorizedRoute,
  authenticatedRoute.addChildren([
    dashboardRoute,
    costsRoute,
    activityLogRoute,

    // Transport
    transportRoute,
    ordersRoute,
    tripsRoute,
    tripsMapRoute,
    tripTrackerRoute,
    tripsCalendarRoute,
    tripsCalendarDndRoute,
    driversRoute,
    driverProfileRoute,

    // Fleet
    fleetRoute,
    partsRoute,
    serviceRoute,
    fuelRoute,
    vehiclesRoute,

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
    advancedReportsRoute,

    // Settings
    settingsRoute,
    settingsAccountRoute,
    settingsAppearanceRoute,
    settingsNotificationsRoute,
    settingsDisplayRoute,

    // EXTRA
    driverPerformanceRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
