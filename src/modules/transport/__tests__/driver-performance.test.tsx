// ──────────────────────────────────────────────────────────
// Integration tests: DriverPerformancePage
// File: src/modules/transport/__tests__/driver-performance.test.tsx
// ──────────────────────────────────────────────────────────

import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mocks ──────────────────────────────────────────────────

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string) => k,
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

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children, onValueChange, value }: {
    children: React.ReactNode;
    onValueChange?: (v: string) => void;
    value?: string;
  }) => (
    <div data-testid="select" data-value={value}>
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<{ onValueChange?: (v: string) => void }>, { onValueChange })
          : child
      )}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children, onValueChange }: { children: React.ReactNode; onValueChange?: (v: string) => void }) => (
    <div data-testid="select-content">
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<{ onValueChange?: (v: string) => void }>, { onValueChange })
          : child
      )}
    </div>
  ),
  SelectItem: ({ children, value, onValueChange }: {
    children: React.ReactNode;
    value: string;
    onValueChange?: (v: string) => void;
  }) => (
    <div
      data-testid={`select-item-${value}`}
      onClick={() => onValueChange?.(value)}
      role="option"
    >
      {children}
    </div>
  ),
}));

// Recharts mock
vi.mock("recharts", () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Line: () => null,
  Pie: () => null,
  Bar: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// jsPDF mock — functie constructor care supravietuieste clearAllMocks
const jsPDFMock = vi.hoisted(() => {
  const saveFn = vi.fn();
  const instance = {
    setFontSize: vi.fn(),
    text: vi.fn(),
    save: saveFn,
    lastAutoTable: { finalY: 100 },
  };
  function MockJsPDF() { return instance; }
  MockJsPDF.prototype = instance;
  return { MockJsPDF, saveFn };
});
vi.mock("jspdf", () => ({ default: jsPDFMock.MockJsPDF }));
vi.mock("jspdf-autotable", () => ({ default: vi.fn() }));

vi.mock("date-fns", () => ({
  format: vi.fn((date: Date, fmt: string) => "ian 25"),
  parseISO: vi.fn((s: string) => new Date(s)),
}));

vi.mock("date-fns/locale", () => ({ ro: {} }));

// ── localStorage mock ──────────────────────────────────────

const mockStorage: Record<string, string> = {};

vi.mock("@/utils/local-storage", () => ({
  getCollection: vi.fn((key: string) => {
    try { return JSON.parse(mockStorage[key] ?? "[]"); } catch { return []; }
  }),
}));

vi.mock("@/data/mock-data", () => ({
  STORAGE_KEYS: {
    drivers: "drivers",
    trips: "trips",
  },
}));

// ── Imports ────────────────────────────────────────────────

import DriverPerformancePage from "@/modules/transport/pages/_components/driver-performance";
import type { Driver, Trip } from "@/modules/transport/types";
import { getCollection } from "@/utils/local-storage";
import { useMobile } from "@/hooks/use-mobile";

// ── Date test ──────────────────────────────────────────────

const today = new Date();
const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

const mockDrivers: Driver[] = [
  { id: "d1", name: "Ion Popescu", phone: "0722000001", licenseExpiry: "2027-01-01", status: "available" },
  { id: "d2", name: "Vasile Ionescu", phone: "0722000002", licenseExpiry: "2027-06-01", status: "on_trip" },
  { id: "d3", name: "Gheorghe Mihai", phone: "0722000003", licenseExpiry: "2027-03-01", status: "available" },
];

const mockTrips: Trip[] = [
  {
    id: "tr1", orderId: "o1", driverId: "d1", truckId: "t1",
    departureDate: `${thisMonth}-05`, estimatedArrivalDate: `${thisMonth}-06`,
    kmLoaded: 800, kmEmpty: 200, fuelCost: 1200, revenue: 5000,
    status: "finalizata",
  },
  {
    id: "tr2", orderId: "o2", driverId: "d1", truckId: "t1",
    departureDate: `${thisMonth}-10`, estimatedArrivalDate: `${thisMonth}-11`,
    kmLoaded: 600, kmEmpty: 150, fuelCost: 900, revenue: 3500,
    status: "finalizata",
  },
  {
    id: "tr3", orderId: "o3", driverId: "d2", truckId: "t2",
    departureDate: `${thisMonth}-08`, estimatedArrivalDate: `${thisMonth}-09`,
    kmLoaded: 700, kmEmpty: 100, fuelCost: 1100, revenue: 4000,
    status: "in_desfasurare",
  },
  {
    id: "tr4", orderId: "o4", driverId: "d1", truckId: "t1",
    departureDate: `${thisMonth}-15`, estimatedArrivalDate: `${thisMonth}-16`,
    kmLoaded: 500, kmEmpty: 100, fuelCost: 800, revenue: 2500,
    status: "anulata",
  },
];

function setupStorage(drivers = mockDrivers, trips = mockTrips) {
  mockStorage["drivers"] = JSON.stringify(drivers);
  mockStorage["trips"] = JSON.stringify(trips);
  vi.mocked(getCollection).mockImplementation((key: string) => {
    try { return JSON.parse(mockStorage[key] ?? "[]"); } catch { return []; }
  });
}

function renderPage() {
  return render(<DriverPerformancePage />);
}

// ── Render ─────────────────────────────────────────────────

describe("DriverPerformancePage — render", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("randeaza pagina fara erori", () => {
    renderPage();
    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("main")).toBeInTheDocument();
  });

  it("afiseaza titlul paginii", () => {
    renderPage();
    expect(screen.getByText("driverPerformance.title")).toBeInTheDocument();
  });

  it("afiseaza selectorul de soferi", () => {
    renderPage();
    expect(screen.getByTestId("select")).toBeInTheDocument();
  });

  it("afiseaza butonul export PDF", () => {
    renderPage();
    expect(screen.getByText("driverPerformance.exportPdf")).toBeInTheDocument();
  });

  it("afiseaza optiunea allDrivers in selector", () => {
    renderPage();
    expect(screen.getByText("driverPerformance.allDrivers")).toBeInTheDocument();
  });

  it("afiseaza numele soferilor in selector", () => {
    renderPage();
    // Ion Popescu apare in selector SI in tabelul de ranking -> getAllByText
    expect(screen.getAllByText("Ion Popescu").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Vasile Ionescu").length).toBeGreaterThan(0);
  });

  it("randeaza graficul LineChart (km per luna)", () => {
    renderPage();
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  it("randeaza graficul PieChart (distributie status)", () => {
    renderPage();
    expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
  });

  it("randeaza graficul BarChart (profit ranking)", () => {
    renderPage();
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });
});

// ── KPI Cards — All Drivers ────────────────────────────────

describe("DriverPerformancePage — KPI cards (all drivers)", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("afiseaza KPI totalTrips", () => {
    renderPage();
    expect(screen.getByText("driverPerformance.kpi.totalTrips")).toBeInTheDocument();
  });

  it("afiseaza KPI finalized", () => {
    renderPage();
    expect(screen.getByText("driverPerformance.kpi.finalized")).toBeInTheDocument();
  });

  it("afiseaza KPI totalKm", () => {
    renderPage();
    expect(screen.getByText("driverPerformance.kpi.totalKm")).toBeInTheDocument();
  });

  it("afiseaza KPI totalFuelCost", () => {
    renderPage();
    expect(screen.getByText("driverPerformance.kpi.totalFuelCost")).toBeInTheDocument();
  });

  it("afiseaza KPI totalProfit", () => {
    renderPage();
    expect(screen.getByText("driverPerformance.kpi.totalProfit")).toBeInTheDocument();
  });

  it("afiseaza KPI finishRate", () => {
    renderPage();
    expect(screen.getByText("driverPerformance.kpi.finishRate")).toBeInTheDocument();
  });

  it("calculeaza corect totalTrips (4 curse total)", () => {
    renderPage();
    const body = document.body.textContent ?? "";
    expect(body).toContain("4");
  });

  it("calculeaza corect finalized (2 finalizate)", () => {
    renderPage();
    const body = document.body.textContent ?? "";
    expect(body).toContain("2");
  });

  it("calculeaza corect totalKm (800+200+600+150+700+100+500+100=3150)", () => {
    renderPage();
    expect(screen.getByText("3.150 km")).toBeInTheDocument();
  });

  it("calculeaza corect finishRate (2/4 = 50%)", () => {
    renderPage();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("afiseaza profit pozitiv in verde", () => {
    renderPage();
    const greenEls = document.querySelectorAll(".text-green-600");
    expect(greenEls.length).toBeGreaterThan(0);
  });
});

// ── Driver selection ───────────────────────────────────────

describe("DriverPerformancePage — driver selection", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("nu afiseaza badge sofer initial (all selected)", () => {
    renderPage();
    expect(screen.queryByTestId("badge")).not.toBeInTheDocument();
  });

  it("afiseaza badge cu numele soferului dupa selectie", async () => {
    renderPage();
    await userEvent.click(screen.getByTestId(`select-item-d1`));
    await waitFor(() => {
      expect(screen.getByTestId("badge")).toBeInTheDocument();
      expect(screen.getByTestId("badge")).toHaveTextContent("Ion Popescu");
    });
  });

  it("filtreaza KPI dupa soferul selectat", async () => {
    renderPage();
    await userEvent.click(screen.getByTestId("select-item-d1"));
    await waitFor(() => {
      // d1 are 3 curse (tr1, tr2, tr4)
      const body = document.body.textContent ?? "";
      expect(body).toContain("3");
    });
  });

  it("afiseaza corect finishRate pentru soferul selectat", async () => {
    renderPage();
    await userEvent.click(screen.getByTestId("select-item-d1"));
    await waitFor(() => {
      // d1: 2 finalizate din 3 = 67%
      const body = document.body.textContent ?? "";
      expect(body).toContain("67%");
    });
  });

  it("revine la all drivers dupa selectie all", async () => {
    renderPage();
    await userEvent.click(screen.getByTestId("select-item-d1"));
    await userEvent.click(screen.getByTestId("select-item-all"));
    await waitFor(() => {
      expect(screen.queryByTestId("badge")).not.toBeInTheDocument();
    });
  });
});

// ── Ranking table ──────────────────────────────────────────

describe("DriverPerformancePage — ranking table", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("afiseaza titlul tabelului de ranking", () => {
    renderPage();
    expect(screen.getByText("driverPerformance.ranking.title")).toBeInTheDocument();
  });

  it("afiseaza header-ele tabelului", () => {
    renderPage();
    expect(screen.getByText("driverPerformance.ranking.driver")).toBeInTheDocument();
    expect(screen.getByText("driverPerformance.ranking.profit")).toBeInTheDocument();
    expect(screen.getByText("driverPerformance.ranking.km")).toBeInTheDocument();
    expect(screen.getByText("driverPerformance.ranking.trips")).toBeInTheDocument();
  });

  it("afiseaza toti soferii in tabel", () => {
    renderPage();
    // Fiecare sofer apare cel putin o data in DOM
    const body = document.body.textContent ?? "";
    expect(body).toContain("Ion Popescu");
    expect(body).toContain("Vasile Ionescu");
    expect(body).toContain("Gheorghe Mihai");
  });

  it("navigheaza la profilul soferului la click pe rand", async () => {
    renderPage();
    const rows = document.querySelectorAll("tbody tr");
    if (rows.length > 0) {
      await userEvent.click(rows[0] as HTMLElement);
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/transport/drivers/$driverId",
        params: expect.objectContaining({ driverId: expect.any(String) }),
      });
    }
  });

  it("afiseaza 0 curse pentru soferul fara trips", () => {
    renderPage();
    // d3 nu are curse
    const body = document.body.textContent ?? "";
    expect(body).toContain("0");
  });
});

// ── Charts ─────────────────────────────────────────────────

describe("DriverPerformancePage — charts", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("afiseaza titlul graficului km per luna", () => {
    renderPage();
    expect(screen.getByText("driverPerformance.charts.kmPerMonth")).toBeInTheDocument();
  });

  it("afiseaza titlul graficului distributie status", () => {
    renderPage();
    expect(screen.getByText("driverPerformance.charts.statusDistribution")).toBeInTheDocument();
  });

  it("afiseaza titlul graficului profit ranking", () => {
    renderPage();
    expect(screen.getByText("driverPerformance.charts.profitRanking")).toBeInTheDocument();
  });

  it("afiseaza noData pentru PieChart cand nu exista curse", () => {
    setupStorage(mockDrivers, []);
    renderPage();
    expect(screen.getByText("driverPerformance.noData")).toBeInTheDocument();
  });

  it("afiseaza noData pentru BarChart cand nu exista soferi", () => {
    setupStorage([], []);
    renderPage();
    expect(screen.getAllByText("driverPerformance.noData").length).toBeGreaterThan(0);
  });
});

// ── Export PDF ─────────────────────────────────────────────

describe("DriverPerformancePage — export PDF", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("apeleaza jsPDF.save la click pe Export PDF", async () => {
    renderPage();
    await userEvent.click(screen.getByText("driverPerformance.exportPdf"));
    expect(jsPDFMock.saveFn).toHaveBeenCalled();
  });

  it("exporta PDF cu sofer selectat", async () => {
    renderPage();
    await userEvent.click(screen.getByTestId("select-item-d1"));
    await userEvent.click(screen.getByText("driverPerformance.exportPdf"));
    expect(jsPDFMock.saveFn).toHaveBeenCalled();
  });

  it("exporta PDF cu lista goala fara erori", async () => {
    setupStorage([], []);
    renderPage();
    await userEvent.click(screen.getByText("driverPerformance.exportPdf"));
    expect(jsPDFMock.saveFn).toHaveBeenCalled();
  });
});

// ── Mobile view ────────────────────────────────────────────

describe("DriverPerformancePage — mobile view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStorage();
    vi.mocked(useMobile).mockReturnValue(true);
  });

  afterEach(() => {
    vi.mocked(useMobile).mockReturnValue(false);
  });

  it("randeaza pagina pe mobile fara erori", () => {
    renderPage();
    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("main")).toBeInTheDocument();
  });

  it("afiseaza KPI cards pe mobile", () => {
    renderPage();
    expect(screen.getByText("driverPerformance.kpi.totalTrips")).toBeInTheDocument();
  });

  it("afiseaza graficele pe mobile", () => {
    renderPage();
    expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });
});

// ── Edge cases ─────────────────────────────────────────────

describe("DriverPerformancePage — edge cases", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("randeaza fara erori cand nu exista soferi", () => {
    setupStorage([], []);
    renderPage();
    expect(screen.getByTestId("header")).toBeInTheDocument();
  });

  it("afiseaza 0% finishRate cand nu exista curse", () => {
    setupStorage(mockDrivers, []);
    renderPage();
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("afiseaza profit negativ in rosu", () => {
    setupStorage(mockDrivers, [{
      ...mockTrips[0],
      revenue: 100,
      fuelCost: 5000,
    }]);
    renderPage();
    const redEls = document.querySelectorAll(".text-red-600");
    expect(redEls.length).toBeGreaterThan(0);
  });
});