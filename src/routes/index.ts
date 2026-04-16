import { createRootRoute, createRoute, createRouter, redirect } from "@tanstack/react-router";

import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";

import DashboardPage from "@/pages/dashboard";
import LoginPage from "@/pages/login";
import NotFoundPage from "@/pages/not-found";
import UnauthorizedPage from "@/pages/unauthorized";
import CostsPage from "@/pages/costs";
import ActivityLogPage from "@/pages/activity-log";
import FleetComparisonPageNew from "@/pages/fleet-comparison";
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
import MaintenancePage from "@/modules/transport/pages/maintenance";
import FuelLogPage from "@/modules/transport/pages/fuel-log";
import FleetComparisonPage from "@/modules/transport/pages/fleet-comparison";

import FleetPage from "@/modules/fleet/index";
import PartsPage from "@/modules/fleet/pages/parts";
import ServicePage from "@/modules/fleet/pages/service";
import FuelPage from "@/modules/fleet/pages/fuel";
import VehiclesPage from "@/modules/fleet/pages/vehicles";

import AccountingPage from "@/modules/accounting/index";
import InvoicesPage from "@/modules/accounting/pages/invoices";
import SuppliersPage from "@/modules/accounting/pages/suppliers";
import ActivityLogAccountingPage from "@/modules/accounting/pages/activity-log-accounting";
import PaymentsPage from "@/modules/accounting/pages/payments";
import DueDatesPage from "@/pages/due-dates";

import HRPage from "@/modules/hr/index";
import EmployeesPage from "@/modules/hr/pages/employees";
import LeavesPage from "@/modules/hr/pages/leaves";
import PayrollPage from "@/modules/hr/pages/payroll";
import AttendancePage from "@/modules/hr/pages/attendance";
import ActivityLogHRPage from "@/modules/hr/pages/activity-log-hr";
import HRSettingsPage from "@/modules/hr/pages/settings-hr";
import EvaluationsPage from "@/modules/hr/pages/evaluations";
import TrainingsPage from "@/modules/hr/pages/trainings";
import RecruitmentPage from "@/modules/hr/pages/recruitment";
import SelfServicePage from "@/pages/self-service";
import ShiftsPage from "@/modules/hr/pages/shifts";

import ReportsPage from "@/modules/reports/index";
import TransportReportsPage from "@/modules/reports/pages/transport-reports";
import FinancialReportsPage from "@/modules/reports/pages/financial-reports";
import FleetReportsPage from "@/modules/reports/pages/fleet-reports";
import AdvancedReportsPage from "@/modules/reports/pages/reports";
import HrReportsPage from "@/modules/reports/pages/reports-hr";

import SettingsPage from "@/pages/settings";
import RecurringExpensesPage from "@/modules/transport/pages/recurring-expenses";
import MileageRegistryPage from "@/modules/transport/pages/mileage-registry";
import BudgetPage from "@/pages/budget";
import DispatcherLivePage from "@/modules/transport/pages/dispatcher-live";

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

const fleetComparisonNewRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/fleet-comparison",
  component: FleetComparisonPageNew,
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
const maintenanceRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/transport/maintenance",
  component: MaintenancePage,
});
const fuelLogRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/transport/fuel-log",
  component: FuelLogPage,
});
const fleetComparisonRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/transport/fleet-comparison",
  component: FleetComparisonPage,
});
const recurringExpensesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/transport/recurring-expenses",
  component: RecurringExpensesPage,
});
const mileageRegistryRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/transport/mileage-registry",
  component: MileageRegistryPage,
});

const dispatcherLiveRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/dispatcher-live",
  component: DispatcherLivePage,
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
const dueDatesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/accounting/due-dates",
  component: DueDatesPage,
});
const suppliersRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/accounting/suppliers",
  component: SuppliersPage,
});
const paymentsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/accounting/payments",
  component: PaymentsPage,
});
const accountingActivityLogRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/accounting/activity-log",
  component: ActivityLogAccountingPage,
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
const attendanceRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/hr/attendance",
  component: AttendancePage,
});
const hrActivityLogRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/hr/activity-log",
  component: ActivityLogHRPage,
});
const hrSettingsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/hr/settings",
  component: HRSettingsPage,
});
const evaluationsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/hr/evaluations",
  component: EvaluationsPage,
});
const trainingsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/hr/trainings",
  component: TrainingsPage,
});
const recruitmentRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/hr/recruitment",
  component: RecruitmentPage,
});
const selfServiceRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/hr/self-service",
  component: SelfServicePage,
});
const shiftsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/hr/shifts",
  component: ShiftsPage,
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
const hrReportsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/reports/hr",
  component: HrReportsPage,
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
const settingsHRRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/settings/hr",
  component: SettingsPage,
});
const settingsInvoicingRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/settings/invoicing",
  component: SettingsPage,
});

const budgetRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/accounting/budget",
  component: BudgetPage,
});

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
    fleetComparisonNewRoute,
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
    maintenanceRoute,
    fuelLogRoute,
    fleetComparisonRoute,
    recurringExpensesRoute,
    mileageRegistryRoute,
    dispatcherLiveRoute,

    // Fleet
    fleetRoute,
    partsRoute,
    serviceRoute,
    fuelRoute,
    vehiclesRoute,

    // Accounting
    accountingRoute,
    invoicesRoute,
    dueDatesRoute,
    suppliersRoute,
    budgetRoute,
    paymentsRoute,
    accountingActivityLogRoute,

    // HR
    hrRoute,
    employeesRoute,
    leavesRoute,
    payrollRoute,
    attendanceRoute,
    hrActivityLogRoute,
    hrSettingsRoute,
    evaluationsRoute,
    trainingsRoute,
    recruitmentRoute,
    selfServiceRoute,
    shiftsRoute,

    // Reports
    reportsRoute,
    transportReportsRoute,
    financialReportsRoute,
    fleetReportsRoute,
    advancedReportsRoute,
    hrReportsRoute,

    // Settings
    settingsRoute,
    settingsAccountRoute,
    settingsAppearanceRoute,
    settingsNotificationsRoute,
    settingsDisplayRoute,
    settingsHRRoute,
    settingsInvoicingRoute,

    driverPerformanceRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}