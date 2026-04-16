import { lazy } from "react";
import { createRootRoute, createRoute, createRouter, redirect } from "@tanstack/react-router";

import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";

// Pagini eager-loaded — intrare rapida in aplicatie.
// Login: prima pagina dupa logout. Dashboard: prima pagina dupa login.
// NotFound & Unauthorized: fallback-uri simple si mici.
import DashboardPage from "@/pages/dashboard";
import LoginPage from "@/pages/login";
import NotFoundPage from "@/pages/not-found";
import UnauthorizedPage from "@/pages/unauthorized";

// Transport
const CostsPage = lazy(() => import("@/modules/transport/pages/costs"));
const ActivityLogPage = lazy(() => import("@/modules/transport/pages/activity-log"));
const DriverPerformancePage = lazy(() => import("@/modules/transport/pages/driver-performance"));
const TransportPage = lazy(() => import("@/modules/transport/index"));
const OrdersPage = lazy(() => import("@/modules/transport/pages/orders"));
const TripsPage = lazy(() => import("@/modules/transport/pages/trips"));
const TripsCalendarPage = lazy(() => import("@/modules/transport/pages/trips-calendar"));
const TripsCalendarDndPage = lazy(() => import("@/modules/transport/pages/trips-calendar-dnd"));
const TripsMapPage = lazy(() => import("@/modules/transport/pages/trips-map"));
const TripTrackerPage = lazy(() => import("@/modules/transport/pages/trip-tracker"));
const DriversPage = lazy(() => import("@/modules/transport/pages/drivers"));
const DriverProfilePage = lazy(() => import("@/modules/transport/pages/driver-profile"));
const MaintenancePage = lazy(() => import("@/modules/transport/pages/maintenance"));
const FuelLogPage = lazy(() => import("@/modules/transport/pages/fuel-log"));
const FleetComparisonPage = lazy(() => import("@/modules/transport/pages/fleet-comparison"));
const RecurringExpensesPage = lazy(() => import("@/modules/transport/pages/recurring-expenses"));
const MileageRegistryPage = lazy(() => import("@/modules/transport/pages/mileage-registry"));
const DispatcherLivePage = lazy(() => import("@/modules/transport/pages/dispatcher-live"));

// Fleet
const FleetPage = lazy(() => import("@/modules/fleet/index"));
const PartsPage = lazy(() => import("@/modules/fleet/pages/parts"));
const ServicePage = lazy(() => import("@/modules/fleet/pages/service"));
const FuelPage = lazy(() => import("@/modules/fleet/pages/fuel"));
const VehiclesPage = lazy(() => import("@/modules/fleet/pages/vehicles"));

// Accounting
const AccountingPage = lazy(() => import("@/modules/accounting/index"));
const InvoicesPage = lazy(() => import("@/modules/accounting/pages/invoices"));
const SuppliersPage = lazy(() => import("@/modules/accounting/pages/suppliers"));
const ClientsPage = lazy(() => import("@/modules/accounting/pages/clients"));
const ActivityLogAccountingPage = lazy(() => import("@/modules/accounting/pages/activity-log"));
const PaymentsPage = lazy(() => import("@/modules/accounting/pages/payments"));
const DueDatesPage = lazy(() => import("@/modules/accounting/pages/due-dates"));
const JournalsPage = lazy(() => import("@/modules/accounting/pages/journals"));
const BudgetPage = lazy(() => import("@/modules/accounting/pages/budget"));

// HR
const HRPage = lazy(() => import("@/modules/hr/index"));
const EmployeesPage = lazy(() => import("@/modules/hr/pages/employees"));
const LeavesPage = lazy(() => import("@/modules/hr/pages/leaves"));
const PayrollPage = lazy(() => import("@/modules/hr/pages/payroll"));
const AttendancePage = lazy(() => import("@/modules/hr/pages/attendance"));
const ActivityLogHRPage = lazy(() => import("@/modules/hr/pages/activity-log"));
const HRSettingsPage = lazy(() => import("@/modules/hr/pages/settings-hr"));
const EvaluationsPage = lazy(() => import("@/modules/hr/pages/evaluations"));
const TrainingsPage = lazy(() => import("@/modules/hr/pages/trainings"));
const RecruitmentPage = lazy(() => import("@/modules/hr/pages/recruitment"));
const EquipmentPage = lazy(() => import("@/modules/hr/pages/equipment"));
const OnboardingPage = lazy(() => import("@/modules/hr/pages/onboarding"));
const SalaryAnalysisPage = lazy(() => import("@/modules/hr/pages/salary-analysis"));
const SelfServicePage = lazy(() => import("@/modules/hr/pages/self-service"));
const ShiftsPage = lazy(() => import("@/modules/hr/pages/shifts"));

// Reports
const ReportsPage = lazy(() => import("@/modules/reports/index"));
const TransportReportsPage = lazy(() => import("@/modules/reports/pages/transport-reports"));
const FinancialReportsPage = lazy(() => import("@/modules/reports/pages/financial-reports"));
const FleetReportsPage = lazy(() => import("@/modules/reports/pages/fleet-reports"));
const AdvancedReportsPage = lazy(() => import("@/modules/reports/pages/reports"));
const HrReportsPage = lazy(() => import("@/modules/reports/pages/reports-hr"));

// Settings
const SettingsPage = lazy(() => import("@/pages/settings"));

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
const clientsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/accounting/clients",
  component: ClientsPage,
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
const journalsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/accounting/journals",
  component: JournalsPage,
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
const equipmentRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/hr/equipment",
  component: EquipmentPage,
});
const onboardingRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/hr/onboarding",
  component: OnboardingPage,
});
const salaryAnalysisRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/hr/salary-analysis",
  component: SalaryAnalysisPage,
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
    clientsRoute,
    budgetRoute,
    paymentsRoute,
    accountingActivityLogRoute,
    journalsRoute,

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
    equipmentRoute,
    onboardingRoute,
    salaryAnalysisRoute,
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
