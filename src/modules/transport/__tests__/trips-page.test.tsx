// @vitest-environment happy-dom

// ──────────────────────────────────────────────────────────
// Integration tests: Trips page (TripsPage component)
// File: src/modules/transport/pages/trips.tsx
//
// Ce trebuie testat:
// - Render initial — tabel cu curse, butoane navigare tabs
// - handleStatusChange() — workflow: planned -> in_desfasurare -> finalizata/anulata
// - Status change side effects — order status updates, driver status updates
// - handleDeleteConfirm() — sterge cursa
// - handleEdit() — deschide dialogul de editare
// - handleGenerateInvoice() — deschide generatorul de facturi
// - Filtrare status — filtrul pe status functioneaza
// - Mobile view — carduri mobile se afiseaza pe ecrane mici
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as React from "react";
import TripsPage from "../pages/trips";
import type { Trip, Order, Driver, Truck } from "../types";

// ─── Mock-uri ──────────────────────────────────────────────

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/hooks/use-audit-log", () => ({
  useAuditLog: () => ({ log: vi.fn() }),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/components/layout/header", () => ({
  Header: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/layout/main", () => ({
  Main: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/confirm-dialog", () => ({
  ConfirmDialog: ({
    open,
    handleConfirm,
    title,
  }: {
    open: boolean;
    handleConfirm: () => void;
    title: string;
  }) =>
    open ? (
      <div>
        <span>{title}</span>
        <button onClick={handleConfirm}>confirm-delete</button>
      </div>
    ) : null,
}));

vi.mock("@/components/data-table/pagination", () => ({
  DataTablePagination: () => <div data-testid="pagination" />,
}));

vi.mock("@/components/data-table/toolbar", () => ({
  DataTableToolbar: () => <div data-testid="toolbar" />,
}));

vi.mock("../pages/_components/trips-export-menu", () => ({
  TripsExportMenu: () => <div data-testid="export-menu" />,
}));

vi.mock("../pages/_components/invoice-generator", () => ({
  InvoiceGenerator: ({
    open,
    onOpenChange,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
  }) =>
    open ? (
      <div data-testid="invoice-generator">
        <button onClick={() => onOpenChange(false)}>close-invoice</button>
      </div>
    ) : null,
}));

vi.mock("../pages/_components/trips-form-dialog", () => ({
  TripFormDialog: ({
    open,
    editingTrip,
    onSaved,
  }: {
    open: boolean;
    editingTrip: Trip | null;
    onSaved: () => void;
  }) =>
    open ? (
      <div data-testid="trip-form-dialog">
        <span data-testid="editing-trip-id">{editingTrip?.id ?? "new"}</span>
        <button data-testid="save-trip" onClick={onSaved}>
          save
        </button>
      </div>
    ) : null,
}));

vi.mock("../pages/_components/trips-mobile-card", () => ({
  TripMobileList: ({
    trips,
    onEdit,
    onDelete,
    onStatusChange,
    onGenerateInvoice,
    noResultsLabel,
  }: {
    trips: Trip[];
    onEdit: (t: Trip) => void;
    onDelete: (t: Trip) => void;
    onStatusChange: (t: Trip) => void;
    onGenerateInvoice: (t: Trip) => void;
    noResultsLabel: string;
  }) =>
    trips.length === 0 ? (
      <div>{noResultsLabel}</div>
    ) : (
      <div>
        {trips.map((trip) => (
          <div key={trip.id} data-testid={`mobile-card-${trip.id}`}>
            <span>{trip.id}</span>
            <button
              data-testid={`mobile-edit-${trip.id}`}
              onClick={() => onEdit(trip)}
            >
              edit
            </button>
            <button
              data-testid={`mobile-delete-${trip.id}`}
              onClick={() => onDelete(trip)}
            >
              delete
            </button>
            <button
              data-testid={`mobile-status-${trip.id}`}
              onClick={() =>
                onStatusChange({ ...trip, status: "in_desfasurare" })
              }
            >
              status
            </button>
            <button
              data-testid={`mobile-invoice-${trip.id}`}
              onClick={() => onGenerateInvoice(trip)}
            >
              invoice
            </button>
          </div>
        ))}
      </div>
    ),
}));

vi.mock("../pages/_components/trips-table-columns", () => ({
  buildColumns: ({
    onStatusChange,
    onEdit,
    onDelete,
    onGenerateInvoice,
  }: {
    onStatusChange: (t: Trip) => void;
    onEdit: (t: Trip) => void;
    onDelete: (t: Trip) => void;
    onGenerateInvoice: (t: Trip) => void;
  }) => [
    {
      id: "id",
      accessorKey: "id",
      header: "ID",
      cell: ({ row }: { row: { original: Trip } }) => (
        <div>
          <span data-testid={`trip-id-${row.original.id}`}>
            {row.original.id}
          </span>
          <button
            data-testid={`status-finalizata-${row.original.id}`}
            onClick={() =>
              onStatusChange({ ...row.original, status: "finalizata" })
            }
          >
            finalizata
          </button>
          <button
            data-testid={`status-anulata-${row.original.id}`}
            onClick={() =>
              onStatusChange({ ...row.original, status: "anulata" })
            }
          >
            anulata
          </button>
          <button
            data-testid={`status-in-desfasurare-${row.original.id}`}
            onClick={() =>
              onStatusChange({ ...row.original, status: "in_desfasurare" })
            }
          >
            in_desfasurare
          </button>
          <button
            data-testid={`edit-${row.original.id}`}
            onClick={() => onEdit(row.original)}
          >
            edit
          </button>
          <button
            data-testid={`delete-${row.original.id}`}
            onClick={() => onDelete(row.original)}
          >
            delete
          </button>
          <button
            data-testid={`invoice-${row.original.id}`}
            onClick={() => onGenerateInvoice(row.original)}
          >
            invoice
          </button>
        </div>
      ),
      size: 100,
    },
  ],
}));

// ─── Helpers ───────────────────────────────────────────────

const seedTrip: Trip = {
  id: "trip-1",
  orderId: "ord-1",
  driverId: "drv-1",
  truckId: "trk-1",
  departureDate: "2025-06-01",
  estimatedArrivalDate: "2025-06-02",
  kmLoaded: 300,
  kmEmpty: 50,
  fuelCost: 450,
  status: "planned",
};

const seedOrder: Order = {
  id: "ord-1",
  clientName: "Acme SRL",
  origin: "Bucuresti",
  destination: "Cluj",
  date: "2025-06-01",
  status: "assigned",
};

const seedDriver: Driver = {
  id: "drv-1",
  name: "Ion Popescu",
  phone: "0700000000",
  licenseExpiry: "2026-01-01",
  status: "on_trip",
};

const seedTruck: Truck = {
  id: "trk-1",
  plateNumber: "B-123-ABC",
  brand: "Volvo",
  model: "FH",
  year: 2020,
  mileage: 100000,
  status: "on_trip",
  itpExpiry: "2026-01-01",
  rcaExpiry: "2026-01-01",
  vignetteExpiry: "2026-01-01",
};

function seed() {
  localStorage.setItem("transmarin_trips", JSON.stringify([seedTrip]));
  localStorage.setItem("transmarin_orders", JSON.stringify([seedOrder]));
  localStorage.setItem("transmarin_drivers", JSON.stringify([seedDriver]));
  localStorage.setItem("transmarin_trucks", JSON.stringify([seedTruck]));
}

function setDesktop() {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: 1280,
  });
}

function setMobile() {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: 375,
  });
}

// ─── Render initial ────────────────────────────────────────
describe("TripsPage — render initial", () => {
  beforeEach(() => {
    localStorage.clear();
    setDesktop();
  });

  afterEach(() => {
    setDesktop();
  });

  it("afiseaza titlul paginii", () => {
    render(<TripsPage />);
    expect(screen.getByText("trips.title")).toBeTruthy();
  });

  it("afiseaza butonul de Add", () => {
    render(<TripsPage />);
    expect(screen.getByText("trips.add")).toBeTruthy();
  });

  it("afiseaza mesajul no results cand nu sunt curse", () => {
    render(<TripsPage />);
    expect(screen.getByText("trips.noResults")).toBeTruthy();
  });

  it("afiseaza cursele din localStorage la mount", () => {
    seed();
    render(<TripsPage />);
    expect(screen.getByTestId("trip-id-trip-1")).toBeTruthy();
  });

  it("deschide dialogul de adaugare la click pe Add", async () => {
    render(<TripsPage />);
    fireEvent.click(screen.getByText("trips.add"));
    await waitFor(() => {
      expect(screen.getByTestId("trip-form-dialog")).toBeTruthy();
      expect(screen.getByTestId("editing-trip-id").textContent).toBe("new");
    });
  });
});

// ─── handleStatusChange — in_desfasurare ──────────────────
describe("TripsPage — handleStatusChange in_desfasurare", () => {
  beforeEach(() => {
    localStorage.clear();
    seed();
    setDesktop();
  });

  it("toast success cand cursa porneste", async () => {
    const { toast } = await import("sonner");
    render(<TripsPage />);

    await waitFor(() => screen.getByTestId("status-in-desfasurare-trip-1"));
    fireEvent.click(screen.getByTestId("status-in-desfasurare-trip-1"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("trips.toast.started");
    });
  });

  it("actualizeaza statusul in localStorage", async () => {
    render(<TripsPage />);

    await waitFor(() => screen.getByTestId("status-in-desfasurare-trip-1"));
    fireEvent.click(screen.getByTestId("status-in-desfasurare-trip-1"));

    await waitFor(() => {
      const trips = JSON.parse(localStorage.getItem("transmarin_trips")!);
      expect(trips[0].status).toBe("in_desfasurare");
    });
  });
});

// ─── handleStatusChange — finalizata ──────────────────────
describe("TripsPage — handleStatusChange finalizata", () => {
  beforeEach(() => {
    localStorage.clear();
    seed();
    setDesktop();
  });

  it("toast success cand cursa e finalizata", async () => {
    const { toast } = await import("sonner");
    render(<TripsPage />);

    await waitFor(() => screen.getByTestId("status-finalizata-trip-1"));
    fireEvent.click(screen.getByTestId("status-finalizata-trip-1"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("trips.toast.finished");
    });
  });

  it("actualizeaza statusul comenzii la delivered", async () => {
    render(<TripsPage />);

    await waitFor(() => screen.getByTestId("status-finalizata-trip-1"));
    fireEvent.click(screen.getByTestId("status-finalizata-trip-1"));

    await waitFor(() => {
      const orders = JSON.parse(localStorage.getItem("transmarin_orders")!);
      expect(orders[0].status).toBe("delivered");
    });
  });

  it("actualizeaza statusul soferului la available", async () => {
    render(<TripsPage />);

    await waitFor(() => screen.getByTestId("status-finalizata-trip-1"));
    fireEvent.click(screen.getByTestId("status-finalizata-trip-1"));

    await waitFor(() => {
      const drivers = JSON.parse(localStorage.getItem("transmarin_drivers")!);
      expect(drivers[0].status).toBe("available");
    });
  });
});

// ─── handleStatusChange — anulata ─────────────────────────
describe("TripsPage — handleStatusChange anulata", () => {
  beforeEach(() => {
    localStorage.clear();
    seed();
    setDesktop();
  });

  it("toast info cand cursa e anulata", async () => {
    const { toast } = await import("sonner");
    render(<TripsPage />);

    await waitFor(() => screen.getByTestId("status-anulata-trip-1"));
    fireEvent.click(screen.getByTestId("status-anulata-trip-1"));

    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith("trips.toast.cancelled");
    });
  });

  it("actualizeaza statusul comenzii la cancelled", async () => {
    render(<TripsPage />);

    await waitFor(() => screen.getByTestId("status-anulata-trip-1"));
    fireEvent.click(screen.getByTestId("status-anulata-trip-1"));

    await waitFor(() => {
      const orders = JSON.parse(localStorage.getItem("transmarin_orders")!);
      expect(orders[0].status).toBe("cancelled");
    });
  });

  it("actualizeaza statusul soferului la available", async () => {
    render(<TripsPage />);

    await waitFor(() => screen.getByTestId("status-anulata-trip-1"));
    fireEvent.click(screen.getByTestId("status-anulata-trip-1"));

    await waitFor(() => {
      const drivers = JSON.parse(localStorage.getItem("transmarin_drivers")!);
      expect(drivers[0].status).toBe("available");
    });
  });
});

// ─── handleDeleteConfirm ───────────────────────────────────
describe("TripsPage — handleDeleteConfirm", () => {
  beforeEach(() => {
    localStorage.clear();
    seed();
    setDesktop();
  });

  it("sterge cursa dupa confirmare", async () => {
    render(<TripsPage />);

    await waitFor(() => screen.getByTestId("delete-trip-1"));
    fireEvent.click(screen.getByTestId("delete-trip-1"));
    fireEvent.click(screen.getByText("confirm-delete"));

    await waitFor(() => {
      expect(screen.queryByTestId("trip-id-trip-1")).toBeNull();
    });
  });

  it("elimina cursa din localStorage", async () => {
    render(<TripsPage />);

    await waitFor(() => screen.getByTestId("delete-trip-1"));
    fireEvent.click(screen.getByTestId("delete-trip-1"));
    fireEvent.click(screen.getByText("confirm-delete"));

    await waitFor(() => {
      const trips = JSON.parse(localStorage.getItem("transmarin_trips")!);
      expect(trips).toHaveLength(0);
    });
  });

  it("toast success dupa stergere", async () => {
    const { toast } = await import("sonner");
    render(<TripsPage />);

    await waitFor(() => screen.getByTestId("delete-trip-1"));
    fireEvent.click(screen.getByTestId("delete-trip-1"));
    fireEvent.click(screen.getByText("confirm-delete"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("trips.toast.deleted");
    });
  });
});

// ─── handleEdit ────────────────────────────────────────────
describe("TripsPage — handleEdit", () => {
  beforeEach(() => {
    localStorage.clear();
    seed();
    setDesktop();
  });

  it("deschide dialogul de editare cu cursa corecta", async () => {
    render(<TripsPage />);

    await waitFor(() => screen.getByTestId("edit-trip-1"));
    fireEvent.click(screen.getByTestId("edit-trip-1"));

    await waitFor(() => {
      expect(screen.getByTestId("trip-form-dialog")).toBeTruthy();
      expect(screen.getByTestId("editing-trip-id").textContent).toBe("trip-1");
    });
  });

  it("reincarca datele dupa save", async () => {
    render(<TripsPage />);

    await waitFor(() => screen.getByTestId("edit-trip-1"));
    fireEvent.click(screen.getByTestId("edit-trip-1"));

    await waitFor(() => screen.getByTestId("save-trip"));
    fireEvent.click(screen.getByTestId("save-trip"));

    await waitFor(() => {
      expect(screen.getByTestId("trip-id-trip-1")).toBeTruthy();
    });
  });
});

// ─── handleGenerateInvoice ─────────────────────────────────
describe("TripsPage — handleGenerateInvoice", () => {
  beforeEach(() => {
    localStorage.clear();
    seed();
    setDesktop();
  });

  it("deschide generatorul de facturi", async () => {
    render(<TripsPage />);

    await waitFor(() => screen.getByTestId("invoice-trip-1"));
    fireEvent.click(screen.getByTestId("invoice-trip-1"));

    await waitFor(() => {
      expect(screen.getByTestId("invoice-generator")).toBeTruthy();
    });
  });

  it("inchide generatorul si reseteaza invoiceTrip", async () => {
    render(<TripsPage />);

    await waitFor(() => screen.getByTestId("invoice-trip-1"));
    fireEvent.click(screen.getByTestId("invoice-trip-1"));

    await waitFor(() => screen.getByTestId("invoice-generator"));
    fireEvent.click(screen.getByText("close-invoice"));

    await waitFor(() => {
      expect(screen.queryByTestId("invoice-generator")).toBeNull();
    });
  });
});

// ─── Mobile view ───────────────────────────────────────────
describe("TripsPage — mobile view", () => {
  beforeEach(() => {
    localStorage.clear();
    seed();
    setMobile();
  });

  afterEach(() => {
    setDesktop();
  });

  it("afiseaza carduri mobile pe ecrane mici", async () => {
    render(<TripsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("mobile-card-trip-1")).toBeTruthy();
    });
  });

  it("edit din mobile card deschide dialogul", async () => {
    render(<TripsPage />);

    await waitFor(() => screen.getByTestId("mobile-edit-trip-1"));
    fireEvent.click(screen.getByTestId("mobile-edit-trip-1"));

    await waitFor(() => {
      expect(screen.getByTestId("trip-form-dialog")).toBeTruthy();
    });
  });

  it("delete din mobile card deschide confirm dialog", async () => {
    render(<TripsPage />);

    await waitFor(() => screen.getByTestId("mobile-delete-trip-1"));
    fireEvent.click(screen.getByTestId("mobile-delete-trip-1"));

    await waitFor(() => {
      expect(screen.getByText("confirm-delete")).toBeTruthy();
    });
  });

  it("status change din mobile card apeleaza handleStatusChange", async () => {
    const { toast } = await import("sonner");

    render(<TripsPage />);

    await waitFor(() => screen.getByTestId("mobile-status-trip-1"));
    fireEvent.click(screen.getByTestId("mobile-status-trip-1"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("trips.toast.started");
    });
  });

  it("invoice din mobile card deschide generatorul", async () => {
    render(<TripsPage />);

    await waitFor(() => screen.getByTestId("mobile-invoice-trip-1"));
    fireEvent.click(screen.getByTestId("mobile-invoice-trip-1"));

    await waitFor(() => {
      expect(screen.getByTestId("invoice-generator")).toBeTruthy();
    });
  });
});

// ─── Tablet view ───────────────────────────────────────────
describe("TripsPage — tablet view", () => {
  beforeEach(() => {
    localStorage.clear();
    seed();
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 900,
    });
  });

  afterEach(() => {
    setDesktop();
  });

  it("afiseaza tabelul pe tablet", async () => {
    render(<TripsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("trip-id-trip-1")).toBeTruthy();
    });
  });
});
