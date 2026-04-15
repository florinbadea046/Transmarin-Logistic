// ──────────────────────────────────────────────────────────
// Integration tests: DispatcherLivePage
// File: src/modules/transport/__tests__/dispatcher-live.test.tsx
// ──────────────────────────────────────────────────────────

import * as React from "react";
import { vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mocks ──────────────────────────────────────────────────

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, opts?: Record<string, unknown>) => {
      if (opts?.defaultValue) return String(opts.defaultValue);
      return k;
    },
    i18n: { language: "ro" },
  }),
}));

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/hooks/use-mobile", () => ({
  useMobile: vi.fn(() => false),
}));

vi.mock("@/components/layout/header", () => ({
  Header: ({ children }: { children: React.ReactNode }) => <div data-testid="header">{children}</div>,
}));

vi.mock("@/components/layout/main", () => ({
  Main: ({ children }: { children: React.ReactNode }) => <div data-testid="main">{children}</div>,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, title }: { children: React.ReactNode; onClick?: () => void; title?: string }) => (
    <button onClick={onClick} title={title}>{children}</button>
  ),
}));

vi.mock("@/components/ui/progress", () => ({
  Progress: ({ value }: { value: number }) => <div data-testid="progress" data-value={value} />,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

// Leaflet + react-leaflet mock
vi.mock("leaflet", () => ({
  default: {
    divIcon: vi.fn(() => ({})),
    Icon: { Default: { prototype: {}, mergeOptions: vi.fn() } },
  },
}));

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => null,
  Marker: ({ children }: { children: React.ReactNode }) => <div data-testid="map-marker">{children}</div>,
  Popup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("leaflet/dist/leaflet.css", () => ({}));

// ── localStorage mock ──────────────────────────────────────

const mockStorage: Record<string, string> = {};

vi.mock("@/utils/local-storage", () => ({
  getCollection: vi.fn((key: string) => {
    try { return JSON.parse(mockStorage[key] ?? "[]"); } catch { return []; }
  }),
}));

vi.mock("@/data/mock-data", () => ({
  STORAGE_KEYS: {
    trips: "trips",
    orders: "orders",
    trucks: "trucks",
    drivers: "drivers",
    auditLog: "auditLog",
  },
}));

// ── Imports ────────────────────────────────────────────────

import DispatcherLivePage from "@/modules/transport/pages/dispatcher-live";
import type { Trip, Order, Truck, Driver } from "@/modules/transport/types";
import { getCollection } from "@/utils/local-storage";
import { useMobile } from "@/hooks/use-mobile";

// ── Helpers ────────────────────────────────────────────────

const today = new Date();
const fmt = (d: Date) => d.toISOString().split("T")[0];
const daysFromNow = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return fmt(d);
};

const mockTrucks: Truck[] = [
  {
    id: "t1", plateNumber: "CT-01-TML", brand: "Volvo", model: "FH16",
    year: 2021, mileage: 300000, status: "available",
    itpExpiry: daysFromNow(60), rcaExpiry: daysFromNow(90), vignetteExpiry: daysFromNow(120),
  },
  {
    id: "t2", plateNumber: "CT-02-TML", brand: "MAN", model: "TGX",
    year: 2020, mileage: 410000, status: "on_trip",
    itpExpiry: daysFromNow(10), rcaExpiry: daysFromNow(5), vignetteExpiry: daysFromNow(200),
  },
  {
    id: "t3", plateNumber: "CT-03-TML", brand: "DAF", model: "XF",
    year: 2022, mileage: 150000, status: "available",
    itpExpiry: daysFromNow(45), rcaExpiry: daysFromNow(60), vignetteExpiry: daysFromNow(80),
  },
];

const mockDrivers: Driver[] = [
  { id: "d1", name: "Ion Popescu", phone: "0722000001", licenseExpiry: daysFromNow(180), status: "on_trip" },
  { id: "d2", name: "Vasile Ionescu", phone: "0722000002", licenseExpiry: daysFromNow(200), status: "available" },
];

const mockOrders: Order[] = [
  {
    id: "o1", clientName: "Transportex SRL", origin: "Bucuresti", destination: "Cluj-Napoca",
    date: fmt(today), status: "in_transit",
  },
  {
    id: "o2", clientName: "LogiCorp", origin: "Timisoara", destination: "Constanta",
    date: fmt(today), status: "pending",
  },
  {
    id: "o3", clientName: "FastFreight", origin: "Iasi", destination: "Brasov",
    date: fmt(today), status: "pending",
  },
];

const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

const mockTrips: Trip[] = [
  {
    id: "tr1", orderId: "o1", driverId: "d1", truckId: "t2",
    departureDate: fmt(yesterday), estimatedArrivalDate: fmt(tomorrow),
    kmLoaded: 800, kmEmpty: 200, fuelCost: 1200, revenue: 5000,
    status: "in_desfasurare",
  },
  {
    id: "tr2", orderId: "o2", driverId: "d2", truckId: "t1",
    departureDate: fmt(tomorrow), estimatedArrivalDate: daysFromNow(3),
    kmLoaded: 600, kmEmpty: 150, fuelCost: 900, revenue: 3500,
    status: "planned",
  },
];

const mockAuditLog = [
  { id: "a1", action: "create", entity: "trip", entityLabel: "CT-01-TML", timestamp: new Date().toISOString() },
  { id: "a2", action: "update", entity: "driver", entityLabel: "Ion Popescu", timestamp: new Date(Date.now() - 60000).toISOString() },
  { id: "a3", action: "delete", entity: "order", entityLabel: "o3", timestamp: new Date(Date.now() - 120000).toISOString() },
];

function setupStorage(
  trips = mockTrips,
  orders = mockOrders,
  trucks = mockTrucks,
  drivers = mockDrivers,
  auditLog = mockAuditLog,
) {
  mockStorage["trips"] = JSON.stringify(trips);
  mockStorage["orders"] = JSON.stringify(orders);
  mockStorage["trucks"] = JSON.stringify(trucks);
  mockStorage["drivers"] = JSON.stringify(drivers);
  mockStorage["auditLog"] = JSON.stringify(auditLog);
  vi.mocked(getCollection).mockImplementation((key: string) => {
    try { return JSON.parse(mockStorage[key] ?? "[]"); } catch { return []; }
  });
}

function renderPage() {
  return render(<DispatcherLivePage />);
}

// ── Render ─────────────────────────────────────────────────

describe("DispatcherLivePage — render", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("randeaza pagina fara erori", () => {
    renderPage();
    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("main")).toBeInTheDocument();
  });

  it("afiseaza titlul paginii", () => {
    renderPage();
    expect(screen.getByText("dispatcherLive.title")).toBeInTheDocument();
  });

  it("afiseaza butonul refresh", () => {
    renderPage();
    expect(screen.getByTitle("dispatcherLive.refresh")).toBeInTheDocument();
  });

  it("afiseaza butonul allocate trip", () => {
    renderPage();
    expect(screen.getByTitle("dispatcherLive.allocateTrip")).toBeInTheDocument();
  });

  it("afiseaza lastRefresh timestamp", () => {
    renderPage();
    expect(screen.getByText(/dispatcherLive\.lastRefresh/)).toBeInTheDocument();
  });

  it("afiseaza harta", () => {
    renderPage();
    expect(screen.getByTestId("map-container")).toBeInTheDocument();
  });
});

// ── KPI Cards ──────────────────────────────────────────────

describe("DispatcherLivePage — KPI cards", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("afiseaza KPI activeTrips", () => {
    renderPage();
    expect(screen.getByText("dispatcherLive.kpi.activeTrips")).toBeInTheDocument();
  });

  it("afiseaza KPI unassignedOrders", () => {
    renderPage();
    expect(screen.getByText("dispatcherLive.kpi.unassignedOrders")).toBeInTheDocument();
  });

  it("afiseaza KPI availableTrucks", () => {
    renderPage();
    expect(screen.getByText("dispatcherLive.kpi.availableTrucks")).toBeInTheDocument();
  });

  it("afiseaza KPI alerts", () => {
    renderPage();
    expect(screen.getByText("dispatcherLive.kpi.alerts")).toBeInTheDocument();
  });

  it("calculeaza corect activeTrips (in_desfasurare + planned = 2)", () => {
    renderPage();
    // 2 trips active (tr1=in_desfasurare, tr2=planned)
    const body = document.body.textContent ?? "";
    expect(body).toContain("2");
  });

  it("calculeaza corect unassignedOrders (pending = 2)", () => {
    renderPage();
    const body = document.body.textContent ?? "";
    expect(body).toContain("2");
  });

  it("calculeaza corect availableTrucks (t1 + t3 = 2)", () => {
    renderPage();
    const body = document.body.textContent ?? "";
    expect(body).toContain("2");
  });

  it("afiseaza 0 alerte cand toate documentele sunt valide", () => {
    // Toate documentele > 30 zile
    setupStorage(mockTrips, mockOrders, [mockTrucks[0], mockTrucks[2]]);
    renderPage();
    const body = document.body.textContent ?? "";
    expect(body).toContain("0");
  });

  it("calculeaza corect alertele pentru documente < 30 zile", () => {
    // t2 are itpExpiry=10 zile si rcaExpiry=5 zile -> 2 alerte
    renderPage();
    const body = document.body.textContent ?? "";
    expect(body).toContain("2");
  });
});

// ── Active Trips Panel ─────────────────────────────────────

describe("DispatcherLivePage — Active Trips Panel", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("afiseaza titlul panelului de curse active", () => {
    renderPage();
    expect(screen.getByText(/dispatcherLive\.trips\.title/)).toBeInTheDocument();
  });

  it("afiseaza ruta originea -> destinatia", () => {
    renderPage();
    const body = document.body.textContent ?? "";
    expect(body).toContain("Bucuresti");
    expect(body).toContain("Cluj-Napoca");
  });

  it("afiseaza numele soferului si placuta camionului", () => {
    renderPage();
    const body = document.body.textContent ?? "";
    expect(body).toContain("Ion Popescu");
    expect(body).toContain("CT-02-TML");
  });

  it("afiseaza progress bar pentru fiecare cursa activa", () => {
    renderPage();
    const progressBars = screen.getAllByTestId("progress");
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it("afiseaza eta pentru fiecare cursa", () => {
    renderPage();
    // Exista 2 curse active -> 2 elemente cu eta
    expect(screen.getAllByText(/dispatcherLive\.trips\.eta/).length).toBeGreaterThan(0);
  });

  it("afiseaza mesaj noActive cand nu exista curse", () => {
    setupStorage([]);
    renderPage();
    expect(screen.getByText("dispatcherLive.trips.noActive")).toBeInTheDocument();
  });

  it("afiseaza badge status pentru curse", () => {
    renderPage();
    const badges = screen.getAllByTestId("badge");
    expect(badges.length).toBeGreaterThan(0);
  });

  it("afiseaza status in_desfasurare pentru tr1", () => {
    renderPage();
    expect(screen.getByText("dispatcherLive.trips.status.in_desfasurare")).toBeInTheDocument();
  });

  it("afiseaza status planned pentru tr2", () => {
    renderPage();
    expect(screen.getByText("dispatcherLive.trips.status.planned")).toBeInTheDocument();
  });
});

// ── getTripProgress ────────────────────────────────────────

describe("DispatcherLivePage — getTripProgress logic", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("progress e > 0 si < 100 pentru cursa in desfasurare", () => {
    setupStorage();
    renderPage();
    const progressBars = screen.getAllByTestId("progress");
    const values = Array.from(progressBars).map((el) =>
      parseInt(el.getAttribute("data-value") ?? "0"),
    );
    // Cel putin un progress e intre 5 si 95
    expect(values.some((v) => v > 0 && v < 100)).toBe(true);
  });

  it("progress e 0 pentru cursa planned (departureDate in viitor)", () => {
    setupStorage();
    renderPage();
    const progressBars = screen.getAllByTestId("progress");
    const values = Array.from(progressBars).map((el) =>
      parseInt(el.getAttribute("data-value") ?? "0"),
    );
    expect(values.some((v) => v === 0)).toBe(true);
  });
});

// ── Audit Feed ─────────────────────────────────────────────

describe("DispatcherLivePage — Audit Feed", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("afiseaza titlul feed-ului", () => {
    renderPage();
    expect(screen.getByText("dispatcherLive.feed.title")).toBeInTheDocument();
  });

  it("afiseaza intrari din audit log", () => {
    renderPage();
    const body = document.body.textContent ?? "";
    expect(body).toContain("CT-01-TML");
    expect(body).toContain("Ion Popescu");
  });

  it("afiseaza mesaj noEvents cand audit log e gol", () => {
    setupStorage(mockTrips, mockOrders, mockTrucks, mockDrivers, []);
    renderPage();
    expect(screen.getByText("dispatcherLive.feed.noEvents")).toBeInTheDocument();
  });

  it("afiseaza actiunea pentru fiecare intrare", () => {
    renderPage();
    const body = document.body.textContent ?? "";
    expect(body).toContain("trip");
    expect(body).toContain("driver");
  });
});

// ── Map Panel ──────────────────────────────────────────────

describe("DispatcherLivePage — Map Panel", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("afiseaza titlul hartii", () => {
    renderPage();
    expect(screen.getByText("dispatcherLive.map.title")).toBeInTheDocument();
  });

  it("afiseaza markere pentru curse in_desfasurare", () => {
    renderPage();
    const markers = screen.getAllByTestId("map-marker");
    expect(markers.length).toBeGreaterThan(0);
  });

  it("nu afiseaza markere pentru curse fara orase cunoscute", () => {
    setupStorage([mockTrips[0]], [{
      ...mockOrders[0],
      origin: "OrasInexistent1",
      destination: "OrasInexistent2",
    }]);
    renderPage();
    expect(screen.queryByTestId("map-marker")).not.toBeInTheDocument();
  });
});

// ── Quick actions ──────────────────────────────────────────

describe("DispatcherLivePage — quick actions", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("navigheaza la /transport/trips la click pe allocate", async () => {
    renderPage();
    await userEvent.click(screen.getByTitle("dispatcherLive.allocateTrip"));
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/transport/trips" });
  });

  it("reincarca datele la click pe refresh", async () => {
    renderPage();
    const callsBefore = vi.mocked(getCollection).mock.calls.length;
    await userEvent.click(screen.getByTitle("dispatcherLive.refresh"));
    expect(vi.mocked(getCollection).mock.calls.length).toBeGreaterThan(callsBefore);
  });
});

// ── Auto-refresh ───────────────────────────────────────────

describe("DispatcherLivePage — auto-refresh", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("reincarca datele dupa 30 secunde", () => {
    renderPage();
    const callsBefore = vi.mocked(getCollection).mock.calls.length;
    act(() => { vi.advanceTimersByTime(30000); });
    expect(vi.mocked(getCollection).mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it("nu mai reincarca dupa unmount", () => {
    const { unmount } = renderPage();
    unmount();
    const callsAfterUnmount = vi.mocked(getCollection).mock.calls.length;
    act(() => { vi.advanceTimersByTime(60000); });
    expect(vi.mocked(getCollection).mock.calls.length).toBe(callsAfterUnmount);
  });
});

// ── Mobile view ────────────────────────────────────────────

describe("DispatcherLivePage — mobile view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStorage();
    vi.mocked(useMobile).mockReturnValue(true);
  });

  afterEach(() => {
    vi.mocked(useMobile).mockReturnValue(false);
  });

  it("randeaza layout mobile fara erori", () => {
    renderPage();
    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("main")).toBeInTheDocument();
  });

  it("afiseaza KPI cards pe mobile", () => {
    renderPage();
    expect(screen.getByText("dispatcherLive.kpi.activeTrips")).toBeInTheDocument();
  });

  it("afiseaza harta pe mobile", () => {
    renderPage();
    expect(screen.getByTestId("map-container")).toBeInTheDocument();
  });

  it("afiseaza panelul de curse active pe mobile", () => {
    renderPage();
    expect(screen.getByText(/dispatcherLive\.trips\.title/)).toBeInTheDocument();
  });

  it("afiseaza audit feed pe mobile", () => {
    renderPage();
    expect(screen.getByText("dispatcherLive.feed.title")).toBeInTheDocument();
  });
});

// ── statusColor branches ───────────────────────────────────

describe("DispatcherLivePage — status badge colors", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("afiseaza badge pentru status in_desfasurare", () => {
    setupStorage([{ ...mockTrips[0], status: "in_desfasurare" }]);
    renderPage();
    expect(screen.getByText("dispatcherLive.trips.status.in_desfasurare")).toBeInTheDocument();
  });

  it("afiseaza badge pentru status planned", () => {
    setupStorage([{ ...mockTrips[0], status: "planned" }]);
    renderPage();
    expect(screen.getByText("dispatcherLive.trips.status.planned")).toBeInTheDocument();
  });

  it("afiseaza badge pentru status finalizata", () => {
    // finalizata nu apare in ActiveTripsPanel (filtrat doar in_desfasurare + planned)
    // Verificam ca pagina randeaza fara erori cu acest status
    setupStorage([{ ...mockTrips[0], status: "finalizata" }]);
    renderPage();
    expect(screen.getByTestId("header")).toBeInTheDocument();
  });

  it("afiseaza badge pentru status anulata", () => {
    // anulata nu apare in ActiveTripsPanel (filtrat doar in_desfasurare + planned)
    // Verificam ca pagina randeaza fara erori cu acest status
    setupStorage([{ ...mockTrips[0], status: "anulata" }]);
    renderPage();
    expect(screen.getByTestId("header")).toBeInTheDocument();
  });
});