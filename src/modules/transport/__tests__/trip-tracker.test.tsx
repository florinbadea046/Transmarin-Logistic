// ──────────────────────────────────────────────────────────
// Integration tests: Trip Tracker
// File: src/modules/transport/__tests__/trip-tracker.test.tsx
// ──────────────────────────────────────────────────────────

import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mocks ──────────────────────────────────────────────────

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: "ro" },
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ tripId: "trip-1" }),
  useNavigate: () => vi.fn(),
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

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

// Leaflet + react-leaflet mock
vi.mock("leaflet", () => ({
  default: {
    divIcon: vi.fn(() => ({})),
    Icon: {
      Default: {
        prototype: {},
        mergeOptions: vi.fn(),
      },
    },
  },
  divIcon: vi.fn(() => ({})),
}));

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => null,
  Marker: ({ children }: { children: React.ReactNode }) => <div data-testid="marker">{children}</div>,
  Polyline: () => <div data-testid="polyline" />,
  Popup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useMap: () => ({ panTo: vi.fn() }),
}));

vi.mock("leaflet/dist/leaflet.css", () => ({}));

// Sidebar components mock
vi.mock("@/modules/transport/pages/_components/trip-tracker-sidebar", () => ({
  ProgressCard: ({ progressPct, running, onStop }: {
    progressPct: number;
    running: boolean;
    progress: number;
    onStop: () => void;
  }) => (
    <div data-testid="progress-card">
      <span data-testid="progress-pct">{progressPct}%</span>
      {running && <button onClick={onStop} data-testid="stop-btn">stopTracking</button>}
    </div>
  ),
  StopsCard: ({ stopNames, order, isStopReached, totalKm }: {
    stopNames: string[];
    order: { origin: string; destination: string } | null;
    isStopReached: (idx: number) => boolean;
    totalKm: number | null;
  }) => (
    <div data-testid="stops-card">
      {stopNames.map((s, i) => (
        <span key={i} data-testid={`stop-${i}`}>{s}{isStopReached(i + 1) ? "✓" : ""}</span>
      ))}
      {totalKm != null && <span data-testid="total-km">{totalKm} km</span>}
    </div>
  ),
  TripDetailsCard: ({ trip, driver, truck, order }: {
    trip: { departureDate: string; estimatedArrivalDate: string };
    driver: { name: string } | null;
    truck: { plateNumber: string; brand: string } | null;
    order: { clientName: string } | null;
  }) => (
    <div data-testid="details-card">
      {driver && <span data-testid="driver-name">{driver.name}</span>}
      {truck && <span data-testid="truck-plate">{truck.plateNumber}</span>}
      {order && <span data-testid="client-name">{order.clientName}</span>}
      <span data-testid="departure">{trip.departureDate}</span>
    </div>
  ),
}));

// Utils mock — importam implementarea reala pentru unit tests, dar mock-am pentru page tests
vi.mock("@/modules/transport/pages/_components/trip-tracker-utils", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/modules/transport/pages/_components/trip-tracker-utils")>();
  return {
    ...real,
    makeTruckIcon: vi.fn(() => ({})),
    makeEndpointIcon: vi.fn(() => ({})),
    makeStopIcon: vi.fn(() => ({})),
    PanTo: () => null,
  };
});

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
    drivers: "drivers",
    trucks: "trucks",
  },
}));

// ── Imports ────────────────────────────────────────────────

import TripTrackerPage from "@/modules/transport/pages/_components/trip-tracker";
import {
  getCoords,
  haversineKm,
  interpolateAlongRoute,
  traveledSegments,
} from "@/modules/transport/pages/_components/trip-tracker-utils";
import type { Trip, Order, Driver, Truck } from "@/modules/transport/types";
import { getCollection } from "@/utils/local-storage";

// ── Date test ──────────────────────────────────────────────

const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

const fmt = (d: Date) => d.toISOString().split("T")[0];

const mockTrip: Trip = {
  id: "trip-1",
  orderId: "order-1",
  driverId: "driver-1",
  truckId: "truck-1",
  departureDate: fmt(yesterday),
  estimatedArrivalDate: fmt(tomorrow),
  kmLoaded: 800,
  kmEmpty: 200,
  fuelCost: 1200,
  revenue: 5000,
  status: "in_desfasurare",
};

const mockOrder: Order = {
  id: "order-1",
  clientName: "Transportex SRL",
  origin: "București",
  destination: "Cluj",
  date: fmt(yesterday),
  status: "in_transit",
};

const mockOrderWithStops: Order = {
  ...mockOrder,
  stops: ["Ploiești", "Brașov"],
};

const mockDriver: Driver = {
  id: "driver-1",
  name: "Ion Popescu",
  phone: "0722000001",
  licenseExpiry: "2027-01-01",
  status: "on_trip",
};

const mockTruck: Truck = {
  id: "truck-1",
  plateNumber: "CT-01-TML",
  brand: "Volvo",
  model: "FH16",
  year: 2021,
  mileage: 300000,
  status: "on_trip",
  itpExpiry: "2026-09-01",
  rcaExpiry: "2026-12-01",
  vignetteExpiry: "2026-06-30",
};

function setupStorage(
  trips: Trip[] = [mockTrip],
  orders: Order[] = [mockOrder],
  drivers: Driver[] = [mockDriver],
  trucks: Truck[] = [mockTruck],
) {
  mockStorage["trips"] = JSON.stringify(trips);
  mockStorage["orders"] = JSON.stringify(orders);
  mockStorage["drivers"] = JSON.stringify(drivers);
  mockStorage["trucks"] = JSON.stringify(trucks);
  vi.mocked(getCollection).mockImplementation((key: string) => {
    try { return JSON.parse(mockStorage[key] ?? "[]"); } catch { return []; }
  });
}

// ══════════════════════════════════════════════════════════
// UNIT TESTS — trip-tracker-utils
// ══════════════════════════════════════════════════════════

describe("getCoords", () => {
  it("returneaza coordonate pentru București", () => {
    expect(getCoords("București")).toEqual([44.4268, 26.1025]);
  });

  it("returneaza coordonate pentru Cluj", () => {
    expect(getCoords("Cluj")).toEqual([46.7712, 23.6236]);
  });

  it("returneaza coordonate pentru Timișoara", () => {
    expect(getCoords("Timișoara")).toEqual([45.7489, 21.2087]);
  });

  it("suporta variante fara diacritice (Timisoara)", () => {
    expect(getCoords("Timisoara")).toEqual([45.7489, 21.2087]);
  });

  it("suporta partial match (Constanta in string mai lung)", () => {
    const result = getCoords("Portul Constanta");
    expect(result).toEqual([44.1598, 28.6348]);
  });

  it("returneaza null pentru oras necunoscut", () => {
    expect(getCoords("XyzOrasInexistent")).toBeNull();
  });

  it("trimeaza spatiile din input", () => {
    expect(getCoords("  Arad  ")).toEqual([46.1731, 21.3154]);
  });

  it("returneaza coordonate pentru toate orasele din CITY_COORDS", () => {
    const orase = ["București", "Cluj", "Iași", "Constanța", "Brașov", "Oradea", "Sibiu"];
    orase.forEach((oras) => {
      expect(getCoords(oras)).not.toBeNull();
    });
  });
});

describe("haversineKm", () => {
  it("returneaza 0 pentru acelasi punct", () => {
    expect(haversineKm([44.4268, 26.1025], [44.4268, 26.1025])).toBe(0);
  });

  it("calculeaza distanta Bucuresti-Cluj aproximativ 330km", () => {
    const buc = getCoords("București")!;
    const cluj = getCoords("Cluj")!;
    const dist = haversineKm(buc, cluj);
    expect(dist).toBeGreaterThan(300);
    expect(dist).toBeLessThan(380);
  });

  it("distanta e simetrica (A->B == B->A)", () => {
    const a: [number, number] = [44.4268, 26.1025];
    const b: [number, number] = [46.7712, 23.6236];
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 5);
  });

  it("returneaza valoare pozitiva pentru puncte diferite", () => {
    expect(haversineKm([44.0, 26.0], [46.0, 23.0])).toBeGreaterThan(0);
  });
});

describe("interpolateAlongRoute", () => {
  const waypoints: [number, number][] = [
    [44.4268, 26.1025], // București
    [44.9365, 26.0138], // Ploiești
    [46.7712, 23.6236], // Cluj
  ];

  it("returneaza null pentru mai putin de 2 waypoints", () => {
    expect(interpolateAlongRoute([[44.4, 26.1]], 0.5)).toBeNull();
  });

  it("returneaza primul waypoint la progress=0", () => {
    expect(interpolateAlongRoute(waypoints, 0)).toEqual(waypoints[0]);
  });

  it("returneaza ultimul waypoint la progress=1", () => {
    expect(interpolateAlongRoute(waypoints, 1)).toEqual(waypoints[waypoints.length - 1]);
  });

  it("returneaza pozitie intermediara la progress=0.5", () => {
    const pos = interpolateAlongRoute(waypoints, 0.5);
    expect(pos).not.toBeNull();
    expect(pos![0]).toBeGreaterThan(44.4);
    expect(pos![0]).toBeLessThan(46.8);
  });

  it("pozitia la progress=0.1 e mai aproape de start decat de final", () => {
    const pos = interpolateAlongRoute(waypoints, 0.1)!;
    const distStart = haversineKm(pos, waypoints[0]);
    const distEnd = haversineKm(pos, waypoints[waypoints.length - 1]);
    expect(distStart).toBeLessThan(distEnd);
  });

  it("pozitia la progress=0.9 e mai aproape de final decat de start", () => {
    const pos = interpolateAlongRoute(waypoints, 0.9)!;
    const distStart = haversineKm(pos, waypoints[0]);
    const distEnd = haversineKm(pos, waypoints[waypoints.length - 1]);
    expect(distEnd).toBeLessThan(distStart);
  });

  it("trateaza waypoints identice (totalLen=0)", () => {
    const same: [number, number][] = [[44.4, 26.1], [44.4, 26.1]];
    expect(interpolateAlongRoute(same, 0.5)).toEqual([44.4, 26.1]);
  });
});

describe("traveledSegments", () => {
  const waypoints: [number, number][] = [
    [44.4268, 26.1025],
    [44.9365, 26.0138],
    [46.7712, 23.6236],
  ];

  it("returneaza array gol la progress=0", () => {
    expect(traveledSegments(waypoints, 0, waypoints[0])).toEqual([]);
  });

  it("returneaza array gol pentru mai putin de 2 waypoints", () => {
    expect(traveledSegments([[44.4, 26.1]], 0.5, [44.4, 26.1])).toEqual([]);
  });

  it("returneaza cel putin 2 puncte la progress > 0", () => {
    const pos = interpolateAlongRoute(waypoints, 0.5)!;
    const segments = traveledSegments(waypoints, 0.5, pos);
    expect(segments.length).toBeGreaterThanOrEqual(2);
  });

  it("primul punct din segmente e intotdeauna originea", () => {
    const pos = interpolateAlongRoute(waypoints, 0.3)!;
    const segments = traveledSegments(waypoints, 0.3, pos);
    expect(segments[0]).toEqual(waypoints[0]);
  });

  it("trateaza waypoints identice (totalLen=0)", () => {
    const same: [number, number][] = [[44.4, 26.1], [44.4, 26.1]];
    expect(traveledSegments(same, 0.5, [44.4, 26.1])).toEqual([]);
  });
});

// ══════════════════════════════════════════════════════════
// INTEGRATION TESTS — TripTrackerPage
// ══════════════════════════════════════════════════════════

describe("TripTrackerPage — not found", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStorage([]); // fara trips
  });

  it("afiseaza mesaj notFound cand trip-ul nu exista", () => {
    render(<TripTrackerPage />);
    expect(screen.getByText("tripTracker.notFound")).toBeInTheDocument();
  });

  it("afiseaza butonul backToTrips in starea not found", () => {
    render(<TripTrackerPage />);
    expect(screen.getByText("tripTracker.backToTrips")).toBeInTheDocument();
  });

  it("afiseaza titlul paginii in starea not found", () => {
    render(<TripTrackerPage />);
    expect(screen.getByText("tripTracker.title")).toBeInTheDocument();
  });
});

describe("TripTrackerPage — render cu date", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStorage();
  });

  it("randeaza pagina fara erori", () => {
    render(<TripTrackerPage />);
    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("main")).toBeInTheDocument();
  });

  it("afiseaza titlul paginii", () => {
    render(<TripTrackerPage />);
    expect(screen.getByText("tripTracker.title")).toBeInTheDocument();
  });

  it("afiseaza butonul backToTrips", () => {
    render(<TripTrackerPage />);
    expect(screen.getByText("tripTracker.backToTrips")).toBeInTheDocument();
  });

  it("afiseaza progress card", () => {
    render(<TripTrackerPage />);
    expect(screen.getByTestId("progress-card")).toBeInTheDocument();
  });

  it("afiseaza details card cu datele tripului", () => {
    render(<TripTrackerPage />);
    expect(screen.getByTestId("details-card")).toBeInTheDocument();
    expect(screen.getByTestId("driver-name")).toHaveTextContent("Ion Popescu");
    expect(screen.getByTestId("truck-plate")).toHaveTextContent("CT-01-TML");
    expect(screen.getByTestId("client-name")).toHaveTextContent("Transportex SRL");
  });

  it("afiseaza harta cand exista coordonate valide", () => {
    render(<TripTrackerPage />);
    expect(screen.getByTestId("map-container")).toBeInTheDocument();
  });

  it("afiseaza badge status in_desfasurare", () => {
    render(<TripTrackerPage />);
    expect(screen.getByText("trips.status.in_desfasurare")).toBeInTheDocument();
  });

  it("afiseaza ruta origin -> destination in titlu card", () => {
    render(<TripTrackerPage />);
    const body = document.body.textContent ?? "";
    expect(body).toContain("București");
    expect(body).toContain("Cluj");
  });

  it("afiseaza data plecarii in details card", () => {
    render(<TripTrackerPage />);
    expect(screen.getByTestId("departure")).toHaveTextContent(fmt(yesterday));
  });
});

describe("TripTrackerPage — cu stops", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStorage([mockTrip], [mockOrderWithStops]);
  });

  it("afiseaza stops card cand exista opriri", () => {
    render(<TripTrackerPage />);
    expect(screen.getByTestId("stops-card")).toBeInTheDocument();
  });

  it("afiseaza numele stopurilor", () => {
    render(<TripTrackerPage />);
    expect(screen.getByTestId("stop-0")).toHaveTextContent("Ploiești");
    expect(screen.getByTestId("stop-1")).toHaveTextContent("Brașov");
  });

  it("afiseaza km total estimat", () => {
    render(<TripTrackerPage />);
    expect(screen.getByTestId("total-km")).toBeInTheDocument();
  });
});

describe("TripTrackerPage — fara coordonate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStorage([mockTrip], [{
      ...mockOrder,
      origin: "OrasInexistent123",
      destination: "AltOrasInexistent456",
    }]);
  });

  it("afiseaza mesaj noCoordsMessage cand orasele nu au coordonate", () => {
    render(<TripTrackerPage />);
    expect(screen.getByText("tripTracker.noCoordsMessage")).toBeInTheDocument();
  });

  it("nu afiseaza harta cand nu exista coordonate", () => {
    render(<TripTrackerPage />);
    expect(screen.queryByTestId("map-container")).not.toBeInTheDocument();
  });
});

describe("TripTrackerPage — stop tracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStorage();
  });

  it("afiseaza butonul stop tracking initial", () => {
    render(<TripTrackerPage />);
    expect(screen.getByTestId("stop-btn")).toBeInTheDocument();
  });

  it("ascunde butonul stop dupa click", async () => {
    render(<TripTrackerPage />);
    await userEvent.click(screen.getByTestId("stop-btn"));
    await waitFor(() => {
      expect(screen.queryByTestId("stop-btn")).not.toBeInTheDocument();
    });
  });
});

describe("TripTrackerPage — progress initial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("progress e > 0 cand trip-ul a inceput (departureDate in trecut)", () => {
    setupStorage();
    render(<TripTrackerPage />);
    const pct = screen.getByTestId("progress-pct");
    const value = parseInt(pct.textContent ?? "0");
    // Trip inceput ieri, termina maine -> progress ~50%
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThan(100);
  });

  it("progress e 0 cand trip-ul nu a inceput inca", () => {
    const futureTrip: Trip = {
      ...mockTrip,
      departureDate: fmt(tomorrow),
      estimatedArrivalDate: fmt(new Date(tomorrow.getTime() + 86400000)),
    };
    setupStorage([futureTrip]);
    render(<TripTrackerPage />);
    const pct = screen.getByTestId("progress-pct");
    expect(pct.textContent).toBe("0%");
  });
});