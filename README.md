# Transmarin Logistic — Transport & Logistics ERP

A full-featured ERP system for **Transmarin Logistic**, a road freight logistics and transport company. Manages the entire operational lifecycle — orders, dispatching with live tracking, fleet and driver management, maintenance, accounting, human resources and analytical reports — all in a modern, responsive, bilingual (RO/EN) web interface with role-based access, per-module audit trails and a centralized notification center.

> **No backend required.** All data is persisted locally via `localStorage`. Ready for API integration.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 19 · TypeScript 5.9 (strict) · Vite 7 |
| Styling | Tailwind CSS 3.4 · shadcn/ui (Radix primitives) |
| Routing | TanStack Router (lazy-loaded routes, role-based auth guards) |
| Data Tables | TanStack Table (sorting, filtering, faceted search, pagination) |
| Forms | React Hook Form + Zod (schema validation) |
| Charts | Recharts (bar, line, pie, radar, area) |
| Maps | Leaflet + React Leaflet (route visualization, live tracking) |
| Drag & Drop | dnd-kit (calendar scheduling) |
| i18n | i18next (25+ namespaces, RO/EN parity) |
| Testing | Vitest · Testing Library · happy-dom / jsdom |
| Export | jsPDF + jspdf-autotable (PDF) · SheetJS (Excel) · PapaParse (CSV) · html2canvas |
| Notifications | Sonner (toasts) · Custom notification center |
| Icons | Lucide React |
| Dates | date-fns · react-day-picker |

---

## Getting Started

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # Production build (tsc -b && vite build)
npm run lint         # ESLint
npm test             # Run Vitest suite
npm run test:watch   # Watch mode
npm run test:coverage
```

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@transmarin.ro | admin |
| Dispatcher | dispecer@transmarin.ro | dispecer |
| HR Manager | hr@transmarin.ro | hr |
| Accountant | contabil@transmarin.ro | contabil |

---

## Modules

Each module has its own `overview.tsx` landing page with KPIs and shortcuts, plus dedicated sub-pages for each workflow.

### Transport & Dispatch

**Orders** — Full CRUD with advanced filters (date range, origin, destination), CSV import with validation preview, duplicate detection, PDF/Excel/CSV export.

**Trips** — Create trips by assigning order + driver + truck. Status workflow: `planned` → `in progress` → `completed` / `cancelled`. Four views: data table, calendar, drag-and-drop calendar, and map.

**Dispatcher Live** — Real-time GPS simulation on a Leaflet map with animated truck markers, route progress, intermediate stops with reached/pending status.

**Trip Tracker** — Per-trip timeline with status transitions and live ETA.

**Drivers / Driver Profile / Driver Performance** — CRUD with Romanian-specific validation (license plate format, phone, CNP). CSV import/export. Driver-truck assignment. Per-driver metrics with RadarChart comparison.

**Maintenance** — Service records with status tracking, cost summary KPI cards, long-service alerts (>7 days).

**Fuel Log** — Refueling records per truck with KPI cards, trend chart, mobile card view.

**Recurring Expenses** — Monthly fixed costs (insurance, leasing, parking) with paid/unpaid status, PieChart category distribution.

**Mileage Registry** — Daily km start/end per truck, trend charts, discrepancy alerts.

**Costs** — Aggregated per-trip / per-truck cost breakdown.

**Fleet Comparison** — Comparative table (profit, km, fuel consumption per truck), "Truck of the Month" card.

**Activity Log** — Transport-scoped audit trail.

### Fleet & Service

**Parts & Supplies** — Inventory with minimum stock alerts, part-to-truck allocation. Zod-validated forms (`fleetSchemas.ts`).

**Service & Repairs** — Service history by type (revision, repair, ITP inspection), cost tracking, parts used.

**Fuel Records** — Fleet-level fuel tracking (distinct from per-driver fuel log).

**Vehicles** — Complete vehicle profile with service cost timeline and full history.

### Accounting

**Invoices** — Income/expense invoices with line items, automatic subtotal/VAT/total calculation, multi-select, bulk actions, export.

**Clients** — Client directory with CUI (tax ID), contact details, invoice history.

**Suppliers** — Supplier directory with CUI, bank account, contact details.

**Payments** — Payment tracking tied to invoices.

**Due Dates** — Calendar of upcoming payable/receivable due dates.

**Journals** — Accounting journal entries.

**Budget** — Category-based budget visualization (persisted per period).

**Activity Log & Notifications** — Accounting-scoped audit trail and notification stream.

### Human Resources

**Employees** — Employee directory with hierarchical org chart (interactive, searchable, collapsible tree with colored department badges). CSV import/export.

**Onboarding** — New hire workflow with checklists and document collection.

**Recruitment** — Candidate pipeline.

**Leaves** — Leave requests with approval workflow (pending → approved/rejected), calendar visualization.

**Payroll / Salary Analysis** — Salary management with bonuses/penalties, automatic calculations, and analytical breakdown (shared logic in `payroll-shared.ts`).

**Attendance** — Monthly timesheet with daily status tracking (present, absent, on leave).

**Shifts** — Shift planning and assignments.

**Evaluations** — Periodic employee evaluations with scoring.

**Trainings** — Training catalog and enrollment.

**Equipment** — Per-employee assigned equipment inventory.

**Self Service** — Employee-facing portal for own records.

**HR Settings** — Module configuration (departments, positions, policies).

**Activity Log** — Complete history of all HR actions.

### Reports & Analytics

**Reports Overview** — Report catalog landing page.

**Transport Reports** — KPIs, km/trips/revenue charts, PDF export.

**Financial Reports** — Income vs. expenses bar chart, expense category breakdown (PieChart), invoice table with search and pagination.

**Fleet Reports** — Maintenance costs, fuel consumption per truck.

**HR Reports** — Employee statistics, leaves per month, top bonuses.

### Dashboard

**KPI Cards** — Active orders, employee count, monthly km, fuel cost, estimated profit.

**Charts** — Km per day (30-day trend), revenue vs. expenses (3-month bar chart).

**Alerts** — Expired ITP/RCA/vignette, long-running maintenance, expired employee documents, pending leave requests.

**Financial Summary** — Invoices this month, balance, overdue invoices >30 days.

### Platform Features

**Role-Based Access** — Four roles with route-level auth guards.

**Notifications** — Centralized notification center with badge count, mark as read. Dedicated accounting and HR streams.

**Activity Logs** — Per-module audit trails (transport, HR, accounting) plus global log.

**Internationalization** — Complete RO/EN bilingual support across 25+ namespaced translation files.

**Responsive Design** — Desktop, tablet, and mobile optimized. Mobile-specific card layouts for all data tables.

**Dark Mode** — System/light/dark theme switching.

**Command Menu** — `Ctrl+K` for quick navigation across all pages.

**Navigation Progress** — Top loading bar on route transitions.

**Page Fallback** — Stable suspense UI for lazy-loaded routes.

**Error Boundary** — Per-route error containment.

**Settings** — User profile, appearance, notification preferences, display layout (compact/default).

**Config Drawer** — Runtime configuration panel.

---

## Architecture

```
src/
├── components/
│   ├── ui/                      # shadcn/ui primitives (Radix-based)
│   ├── layout/                  # Header, Sidebar, Navigation, TopNav
│   ├── data-table/              # Reusable Toolbar, Pagination, Column Header
│   ├── charts/                  # Shared chart primitives
│   ├── notifications/           # Notification center components
│   ├── command-menu.tsx         # Ctrl+K navigator
│   ├── config-drawer.tsx        # Runtime config panel
│   ├── navigation-progress.tsx  # Top loading bar
│   ├── page-fallback.tsx        # Suspense UI
│   ├── error-boundary.tsx
│   ├── accounting-notifications.tsx
│   └── hr-notifications.tsx
├── context/                     # Auth, Theme, Layout, Direction, Search providers
├── hooks/                       # useAuditLog, useHrAuditLog, useDialogState, useMobile
├── i18n/resources/{en,ro}/      # 25+ JSON namespaces per language
├── data/mock-data.ts            # Seed data + STORAGE_KEYS
├── utils/                       # localStorage CRUD, formatters, transport settings
├── lib/                         # Shared helpers (cn, etc.)
├── types/                       # Global type declarations
├── __tests__/                   # App-level tests
├── modules/
│   ├── transport/               # Orders, trips, drivers, trucks, dispatcher, costs…
│   │   ├── pages/               # Orchestrators
│   │   ├── pages/_components/   # Extracted sub-components
│   │   ├── __tests__/
│   │   ├── overview.tsx
│   │   └── types.ts
│   ├── fleet/                   # Parts, service, fuel, vehicles + Zod validation/
│   ├── accounting/              # Invoices, clients, suppliers, payments, journals…
│   ├── hr/                      # Employees, onboarding, payroll, evaluations…
│   │   ├── hooks/  payroll/  utils/  __tests__/
│   ├── reports/                 # Transport, financial, fleet, HR reports + hooks/
│   └── notifications/           # Notification types + generation logic
├── pages/                       # Dashboard, Login, Settings, NotFound, Unauthorized
└── routes/                      # TanStack Router configuration + auth guards
```

### Design Patterns

**Module-per-Domain** — Each business module owns its types, pages, components, utils, hooks, validation, and tests. Every module exposes an `overview.tsx` landing page.

**Orchestrator Pattern** — Each page is a slim orchestrator that manages state, handlers, and layout. UI sub-components (dialogs, forms, tables, charts, cards) live in `_components/` with explicit props interfaces.

**Separation of Concerns** — Pure functions and constants live in `.ts` files; React components live in `.tsx`. No mixed exports (avoids Fast Refresh issues).

**Type Safety** — TypeScript strict mode with zero errors. Zod schemas for runtime validation at data entry points (e.g. `fleet/validation/fleetSchemas.ts`).

**Consistent Data Layer** — All localStorage operations go through `src/utils/local-storage.ts` (`getCollection`, `addItem`, `updateItem`, `removeItem`). Storage keys are centralized in `STORAGE_KEYS`.

**Lazy Routing** — Routes are code-split; `PageFallback` provides stable loading UI during suspense.

**Testable by Module** — Each module ships its own `__tests__/` folder; run the suite with `npm test`.

---

## Data Persistence

All data is stored in browser localStorage. Storage keys are defined in `src/data/mock-data.ts`:

| Key | Module | Description |
|-----|--------|-------------|
| `transmarin_orders` | Transport | Customer orders |
| `transmarin_trips` | Transport | Scheduled trips |
| `transmarin_drivers` | Transport | Driver records |
| `transmarin_trucks` | Transport | Truck fleet |
| `transmarin_maintenance` | Transport | Maintenance records |
| `transmarin_fuel_log` | Transport | Fuel log entries |
| `transmarin_recurring_expenses` | Transport | Recurring monthly costs |
| `transmarin_transport_settings` | Transport | Transport configuration |
| `transmarin_trip_invoices` | Transport | Trip-linked invoices |
| `transmarin_parts` | Fleet | Parts inventory |
| `transmarin_service_records` | Fleet | Service history |
| `transmarin_fuel_records` | Fleet | Fuel records |
| `transmarin_invoices` | Accounting | Invoices |
| `transmarin_clients` | Accounting | Client directory |
| `transmarin_suppliers` | Accounting | Supplier directory |
| `transmarin_payments` | Accounting | Payment records |
| `transmarin_budgets` | Accounting | Budget data |
| `transmarin_accounting_audit_log` | Accounting | Accounting audit trail |
| `transmarin_accounting_notifications` | Accounting | Accounting notifications |
| `transmarin_employees` | HR | Employee records |
| `transmarin_leave_requests` | HR | Leave requests |
| `transmarin_bonuses` | HR | Bonuses and penalties |
| `transmarin_attendance` | HR | Attendance records |
| `transmarin_hr_settings` | HR | HR configuration |
| `transmarin_hr_audit_log` | HR | HR audit trail |
| `transmarin_evaluations` | HR | Performance evaluations |
| `transmarin_trainings` | HR | Training records |
| `transmarin_recruitment` | HR | Recruitment pipeline |
| `transmarin_equipment` | HR | Assigned equipment |
| `transmarin_onboarding` | HR | Onboarding workflows |
| `transmarin_shifts` | HR | Shift schedules |
| `transmarin_notifications` | System | Notifications |
| `transmarin_audit_log` | System | General audit trail |

Seed data loads automatically on first run when localStorage is empty.
