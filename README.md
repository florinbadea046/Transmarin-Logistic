# Transmarin Logistic — Transport & Logistics ERP

A full-featured ERP system for **Transmarin Logistic**, a road freight transport company. Manages the entire operational lifecycle — orders, fleet dispatching, driver management, accounting, human resources and business intelligence — all in a modern, responsive, bilingual (RO/EN) web interface.

> **No backend required.** All data is persisted locally via `localStorage`. Ready for API integration.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 19 · TypeScript 5.9 (strict) · Vite 7 |
| Styling | Tailwind CSS 3.4 · shadcn/ui (Radix primitives) |
| Routing | TanStack Router (40+ routes, role-based auth guards) |
| Data Tables | TanStack Table (sorting, filtering, faceted search, pagination) |
| Forms | React Hook Form + Zod (schema validation) |
| Charts | Recharts (bar, line, pie, radar) |
| Maps | Leaflet + React Leaflet (route visualization, live tracking) |
| Drag & Drop | dnd-kit (calendar scheduling) |
| i18n | i18next (1,700+ translation keys, RO/EN parity) |
| Export | jsPDF + jspdf-autotable (PDF) · SheetJS (Excel) · PapaParse (CSV) |
| Notifications | Sonner (toasts) · Custom notification center |
| Icons | Lucide React |
| Dates | date-fns |

---

## Getting Started

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # Production build
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

### Transport & Dispatch

**Order Management** — Full CRUD with advanced filters (date range, origin, destination), CSV import with validation preview, duplicate detection, PDF/Excel/CSV export.

**Trip Scheduling** — Create trips by assigning order + driver + truck. Status workflow: `planned` → `in progress` → `completed` / `cancelled`. Four views: data table, calendar, drag-and-drop calendar, and map.

**Live Tracking** — Real-time GPS simulation on a Leaflet map with animated truck marker, route progress bar, intermediate stops with reached/pending status.

**Driver & Truck Management** — CRUD with Romanian-specific validation (license plate format, phone, CNP). CSV import/export. Driver-truck assignment. Document management with expiry alerts.

**Maintenance** — Service records with status tracking, cost summary KPI cards, long-service alerts (>7 days).

**Fuel Log** — Refueling records per truck with KPI cards, trend chart, mobile card view.

**Recurring Expenses** — Monthly fixed costs (insurance, leasing, parking) with paid/unpaid status, PieChart category distribution.

**Mileage Registry** — Daily km start/end per truck, trend charts, discrepancy alerts.

**Driver Performance** — Per-driver metrics with RadarChart comparison.

**Fleet Comparison** — Comparative table (profit, km, fuel consumption per truck), "Truck of the Month" card.

### Fleet & Service

**Parts & Supplies** — Inventory with minimum stock alerts, part-to-truck allocation.

**Service & Repairs** — Service history by type (revision, repair, ITP inspection), cost tracking, parts used.

**Vehicle Card** — Complete vehicle profile with service cost timeline and full history.

### Accounting

**Invoices** — Income/expense invoices with line items, automatic subtotal/VAT/total calculation, multi-select, bulk actions, export.

**Suppliers** — Supplier directory with CUI (tax ID), bank account, contact details.

**Budget** — Category-based budget visualization.

### Human Resources

**Employees** — Employee directory with hierarchical org chart (interactive, searchable, collapsible tree with colored department badges). CSV import/export.

**Leave Management** — Leave requests with approval workflow (pending → approved/rejected), calendar visualization.

**Payroll** — Salary management with bonuses/penalties, automatic calculations.

**Attendance** — Monthly timesheet with daily status tracking (present, absent, on leave).

**Documents** — Per-employee document management with expiry date tracking and alerts.

**HR Audit Log** — Complete history of all HR actions.

### Reports & Analytics

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

**Role-Based Access** — Four roles with appropriate permissions.

**Notifications** — Centralized notification center with badge count, mark as read. Types: expired licenses, truck document alerts, delayed trips, unassigned orders.

**Activity Log** — Full audit trail for all CRUD operations across modules.

**Internationalization** — Complete RO/EN bilingual support (1,700+ keys, 100% parity).

**Responsive Design** — Desktop, tablet, and mobile optimized. Mobile-specific card layouts for all data tables.

**Dark Mode** — System/light/dark theme switching.

**Command Menu** — `Ctrl+K` for quick navigation across all pages.

**Settings** — User profile, appearance, notification preferences, display layout (compact/default).

---

## Architecture

```
src/
├── components/
│   ├── ui/                      # 30+ shadcn/ui primitives (Radix-based)
│   ├── layout/                  # Header, Sidebar, Navigation, TopNav
│   ├── data-table/              # Reusable Toolbar, Pagination, Column Header
│   └── notifications/           # Notification center components
├── context/                     # Auth, Theme, Layout, Direction, Search providers
├── hooks/                       # useAuditLog, useHrAuditLog, useDialogState, useMobile
├── i18n/resources/{en,ro}/      # 21 JSON files per language
├── data/mock-data.ts            # Seed data + STORAGE_KEYS
├── utils/                       # localStorage CRUD, formatters, transport settings
├── types/                       # Global type declarations
├── modules/
│   ├── transport/               # Orders, trips, drivers, trucks, maintenance, fuel
│   │   ├── pages/               # Page components (orchestrators)
│   │   ├── pages/_components/   # 40+ extracted sub-components
│   │   └── types.ts
│   ├── fleet/                   # Parts, service records, fuel records, vehicles
│   ├── accounting/              # Invoices, suppliers
│   ├── hr/                      # Employees, leaves, payroll, attendance
│   ├── reports/                 # Transport, financial, fleet, HR reports
│   └── notifications/           # Notification types + generation logic
├── pages/                       # Dashboard, Login, Settings, Budget
└── routes/                      # TanStack Router configuration + auth guards
```

### Design Patterns

**Orchestrator Pattern** — Each page is a slim orchestrator (~200-400 lines) that manages state, handlers, and layout. All UI sub-components (dialogs, forms, tables, charts, cards) are extracted into `_components/` with explicit props interfaces.

**Module Isolation** — Each business module has its own types, pages, and components. Cross-module dependencies go through shared utilities.

**Separation of Concerns** — Pure functions and constants live in `.ts` files. React components live in `.tsx` files. No mixed exports (avoids Fast Refresh issues).

**Type Safety** — TypeScript strict mode with zero errors. Zod schemas for runtime validation at data entry points.

**Consistent Data Layer** — All localStorage operations go through `src/utils/local-storage.ts` (`getCollection`, `addItem`, `updateItem`, `removeItem`). Storage keys are centralized in `STORAGE_KEYS`.

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
| `transmarin_suppliers` | Accounting | Supplier directory |
| `transmarin_employees` | HR | Employee records |
| `transmarin_leave_requests` | HR | Leave requests |
| `transmarin_bonuses` | HR | Bonuses and penalties |
| `transmarin_attendance` | HR | Attendance records |
| `transmarin_hr_settings` | HR | HR configuration |
| `transmarin_hr_audit_log` | HR | HR audit trail |
| `transmarin_notifications` | System | Notifications |
| `transmarin_audit_log` | System | General audit trail |

Seed data loads automatically on first run when localStorage is empty.

---

## Code Quality

| Metric | Status |
|--------|--------|
| TypeScript | 0 errors (strict mode) |
| ESLint | 0 errors, 0 warnings |
| `console.log` in production code | 0 |
| `dangerouslySetInnerHTML` | 0 |
| `@ts-ignore` / `@ts-expect-error` | 0 |
| `as any` | 3 (Leaflet icon workaround + zod/RHF type gap — unavoidable) |
| Translation parity | 1,700+ keys, EN = RO (100%) |

---

## License

Educational project. Not licensed for commercial use.
