# Transmarin Logistic – ERP Frontend (React)

Frontend for an ERP-style web application for **Transmarin Logistic** (transport & logistics).

This project runs **without a backend**. All data is persisted locally using **localStorage**.

---

## 🚀 Tech Stack

- React 18 + Vite
- TypeScript
- Tailwind CSS
- React Router v6
- UI: shadcn/ui
- Recharts (charts)
- TanStack Table (data tables)
- React Hook Form + Zod (forms + validation)
- Sonner (toast notifications)
- SheetJS (xlsx) + jsPDF (exports)
- PapaParse (CSV import)
- Lucide React (icons)
- date-fns (date utilities)

---

## ⚙️ Local Setup

### 1️⃣ Install dependencies

```bash
npm install
```

### 2️⃣ Run development server

```bash
npm run dev
```

The app runs at:

```
http://localhost:5173
```

### 3️⃣ Build for production

```bash
npm run build
npm run preview
```

---

## 🔀 Git Workflow

⚠️ Do **not** push directly to `main`.

Branch naming convention:

```
task-[ID]-[short-description]
```

Example:

```bash
git checkout main
git pull origin main
git checkout -b task-T1-01-project-setup
```

After implementation:

```bash
git add .
git commit -m "feat: implement transport module table"
git push --set-upstream origin task-T1-01-project-setup
```

Open a Pull Request to `main`.

---

## 🗂️ Project Architecture

```text
src/
├── assets/                       # images, logos
├── components/
│   ├── ui/                       # shadcn/ui generated components
│   ├── common/                   # reusable shared components
│   └── feedback/                 # Loader, EmptyState, ErrorState
├── constants/                    # global constants (localStorage keys etc.)
├── context/                      # React contexts (AuthContext etc.)
├── data/                         # mock JSON (seed data)
├── hooks/                        # custom hooks (useLocalStorage etc.)
├── layouts/                      # AuthLayout, DashboardLayout
├── modules/
│   ├── transport/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types/
│   ├── fleet/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types/
│   ├── accounting/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types/
│   ├── hr/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types/
│   └── reports/
│       ├── pages/
│       ├── components/
│       ├── hooks/
│       └── types/
├── pages/                        # Login, Dashboard, NotFound
├── providers/                    # AppProviders (Auth, Toasts, etc.)
├── routes/                       # React Router configuration + guards
├── services/                     # localStorage CRUD helpers, exporters
├── styles/                       # global styles, theme tokens
├── utils/                        # helpers (formatters, KPI calculators)
├── App.tsx
└── main.tsx
```

---

## 💾 Data Persistence (localStorage)

All data is stored locally in the browser.

### 🔑 Standardized Storage Keys

```
auth_user

transport_trucks
transport_drivers
transport_trips
transport_orders

fleet_inventory
fleet_services
fleet_alerts

hr_employees
hr_leaves
hr_documents

accounting_suppliers
accounting_invoices

notifications_center
```

Helper utilities are located in:

```
src/services/storage.ts
```

Constants file:

```
src/constants/storageKeys.ts
```

---

## 🧩 Modules Overview

### 🚛 Transport & Dispatch

- Trucks
- Drivers
- Trips
- Orders

### 🚚 Fleet & Maintenance

- Inventory
- Service records
- Technical alerts

### 💰 Accounting

- Suppliers
- Invoices
- Payments

### 👥 HR

- Employees
- Leave management
- Documents

### 📊 Reports & Dashboard

- KPIs
- Charts
- Export to PDF / Excel

---

## 🎨 UI Guidelines

- Clean corporate design (blue / gray / white)
- Responsive layout (desktop + tablet)
- Consistent spacing and typography
- Clear feedback (loading states, validation, toasts)

---

## 🏗️ Architecture Principles

- Modular structure per business domain
- Reusable UI components
- Strict TypeScript typing
- LocalStorage abstraction layer
- Separation of concerns (modules, services, utils)

---

## 📌 Notes

This is a frontend-only educational project.  
No real backend integration is required at this stage.  
All CRUD operations are handled via localStorage.
