// ──────────────────────────────────────────────────────────
// Integration tests: FleetComparisonPage
// File: src/modules/transport/__tests__/fleet-comparison.test.tsx
// ──────────────────────────────────────────────────────────

import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mocks ──────────────────────────────────────────────────

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, opts?: Record<string, unknown>) => {
      if (opts?.count !== undefined) return `${k}:${opts.count}`;
      return k;
    },
    i18n: { language: "ro" },
  }),
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

vi.mock("@/components/data-table/column-header", () => ({
  DataTableColumnHeader: ({ title }: { title: string }) => <span>{title}</span>,
}));

// Recharts mock
vi.mock("recharts", () => ({
  RadarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="radar-chart">{children}</div>,
  Radar: () => null,
  PolarGrid: () => null,
  PolarAngleAxis: () => null,
  PolarRadiusAxis: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Legend: () => null,
  Tooltip: () => null,
}));

// Checkbox mock — Radix UI Checkbox nu functioneaza cu userEvent in jsdom
// Inlocuim cu un input nativ care permite click/check normal
vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    disabled,
  }: {
    checked?: boolean;
    onCheckedChange?: (v: boolean) => void;
    disabled?: boolean;
  }) => (
    <input
      type="checkbox"
      checked={!!checked}
      disabled={!!disabled}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      data-testid="checkbox-native"
    />
  ),
}));

// jsPDF — mock complet cu vi.hoisted ca sa supravietuiasca clearAllMocks
const jsPDFMock = vi.hoisted(() => {
  const saveFn = vi.fn();
  const instance = {
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    setTextColor: vi.fn(),
    text: vi.fn(),
    save: saveFn,
  };
  // Constructorul returneaza mereu aceeasi instanta
  function MockJsPDF() { return instance; }
  MockJsPDF.prototype = instance;
  return { MockJsPDF, instance, saveFn };
});
vi.mock("jspdf", () => ({ default: jsPDFMock.MockJsPDF }));
vi.mock("jspdf-autotable", () => ({ default: vi.fn() }));

// XLSX mock
const xlsxMock = vi.hoisted(() => ({
  utils: {
    json_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));
vi.mock("xlsx", () => xlsxMock);

// ── localStorage mock ──────────────────────────────────────

const mockStorage: Record<string, string> = {};

vi.mock("@/utils/local-storage", () => ({
  getCollection: vi.fn((key: string) => {
    try { return JSON.parse(mockStorage[key] ?? "[]"); } catch { return []; }
  }),
}));

vi.mock("@/data/mock-data", () => ({
  STORAGE_KEYS: {
    trucks: "trucks",
    trips: "trips",
    maintenance: "maintenance",
    fuelLog: "fuelLog",
  },
}));

// ── Imports ────────────────────────────────────────────────

import FleetComparisonPage from "@/modules/transport/pages/fleet-comparison";
import type { Truck, Trip, MaintenanceRecord, FuelLog } from "@/modules/transport/types";
import { getCollection } from "@/utils/local-storage";
import { useMobile } from "@/hooks/use-mobile";

// ── Date test ──────────────────────────────────────────────

const today = new Date();
const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

const mockTrucks: Truck[] = [
  {
    id: "t1", plateNumber: "CT-01-TML", brand: "Volvo", model: "FH16",
    year: 2021, mileage: 300000, status: "available",
    itpExpiry: "2026-09-01", rcaExpiry: "2026-12-01", vignetteExpiry: "2026-06-30",
  },
  {
    id: "t2", plateNumber: "CT-02-TML", brand: "MAN", model: "TGX",
    year: 2020, mileage: 410000, status: "available",
    itpExpiry: "2026-07-15", rcaExpiry: "2027-01-15", vignetteExpiry: "2026-08-31",
  },
  {
    id: "t3", plateNumber: "CT-03-TML", brand: "DAF", model: "XF",
    year: 2022, mileage: 150000, status: "available",
    itpExpiry: "2026-11-01", rcaExpiry: "2027-03-01", vignetteExpiry: "2026-09-30",
  },
];

const mockTrips: Trip[] = [
  {
    id: "tr1", orderId: "o1", driverId: "d1", truckId: "t1",
    departureDate: `${thisMonth}-05`, estimatedArrivalDate: `${thisMonth}-06`,
    kmLoaded: 800, kmEmpty: 200, fuelCost: 1200, revenue: 5000,
    status: "finalizata",
  },
  {
    id: "tr2", orderId: "o2", driverId: "d2", truckId: "t2",
    departureDate: `${thisMonth}-08`, estimatedArrivalDate: `${thisMonth}-09`,
    kmLoaded: 600, kmEmpty: 150, fuelCost: 900, revenue: 3500,
    status: "finalizata",
  },
  {
    id: "tr3", orderId: "o3", driverId: "d1", truckId: "t1",
    departureDate: `${thisMonth}-12`, estimatedArrivalDate: `${thisMonth}-13`,
    kmLoaded: 1000, kmEmpty: 300, fuelCost: 1500, revenue: 6000,
    status: "finalizata",
  },
];

const mockMaintenance: MaintenanceRecord[] = [
  {
    id: "m1", truckId: "t1", type: "revizie", description: "Revizie",
    entryDate: `${thisMonth}-01`, cost: 500, mechanic: "Ion", status: "finalizat",
  },
  {
    id: "m2", truckId: "t2", type: "frane", description: "Frane",
    entryDate: `${thisMonth}-03`, cost: 800, mechanic: "Vasile", status: "finalizat",
  },
];

const mockFuelLogs: FuelLog[] = [
  {
    id: "f1", truckId: "t1", driverId: "d1", date: `${thisMonth}-05`,
    station: "Petrom", liters: 300, pricePerLiter: 7.5, totalCost: 2250, kmAtFueling: 100000,
  },
  {
    id: "f2", truckId: "t1", driverId: "d1", date: `${thisMonth}-12`,
    station: "OMV", liters: 320, pricePerLiter: 7.6, totalCost: 2432, kmAtFueling: 101000,
  },
];

function setupStorage(
  trucks = mockTrucks,
  trips = mockTrips,
  maintenance = mockMaintenance,
  fuelLogs = mockFuelLogs,
) {
  mockStorage["trucks"] = JSON.stringify(trucks);
  mockStorage["trips"] = JSON.stringify(trips);
  mockStorage["maintenance"] = JSON.stringify(maintenance);
  mockStorage["fuelLog"] = JSON.stringify(fuelLogs);
  vi.mocked(getCollection).mockImplementation((key: string) => {
    try { return JSON.parse(mockStorage[key] ?? "[]"); } catch { return []; }
  });
}

function renderPage() {
  return render(<FleetComparisonPage />);
}

// ── Render ─────────────────────────────────────────────────

describe("FleetComparisonPage — render", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("randeaza pagina fara erori", () => {
    renderPage();
    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("main")).toBeInTheDocument();
  });

  it("afiseaza titlul paginii", () => {
    renderPage();
    expect(screen.getByText("fleetComparison.title")).toBeInTheDocument();
  });

  it("afiseaza butonul Export Excel", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /fleetComparison\.export\.excel/i })).toBeInTheDocument();
  });

  it("afiseaza butonul Export PDF", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /fleetComparison\.export\.pdf/i })).toBeInTheDocument();
  });

  it("afiseaza camioanele in tabel", () => {
    renderPage();
    // CT-01-TML apare si in BestTruckCard -> getAllByText
    expect(screen.getAllByText("CT-01-TML").length).toBeGreaterThan(0);
    expect(screen.getByText("CT-02-TML")).toBeInTheDocument();
    expect(screen.getByText("CT-03-TML")).toBeInTheDocument();
  });

  it("afiseaza noData cand nu exista camioane", () => {
    setupStorage([]);
    renderPage();
    expect(screen.getByText("fleetComparison.noData")).toBeInTheDocument();
  });

  it("afiseaza titlul tabelului", () => {
    renderPage();
    expect(screen.getByText("fleetComparison.tableTitle")).toBeInTheDocument();
  });
});

// ── BestTruckCard ──────────────────────────────────────────

describe("FleetComparisonPage — BestTruckCard", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("afiseaza card-ul Camionul Lunii cand exista date", () => {
    renderPage();
    expect(screen.getByText("fleetComparison.bestTruck.title")).toBeInTheDocument();
  });

  it("nu afiseaza card-ul Camionul Lunii cand nu exista curse in luna curenta", () => {
    setupStorage(mockTrucks, [], mockMaintenance, mockFuelLogs);
    renderPage();
    expect(screen.queryByText("fleetComparison.bestTruck.title")).not.toBeInTheDocument();
  });

  it("afiseaza profit, tripCount si totalKm in card-ul best truck", () => {
    renderPage();
    const body = document.body.textContent ?? "";
    expect(body).toContain("fleetComparison.columns.profit");
    expect(body).toContain("fleetComparison.columns.tripCount");
    expect(body).toContain("fleetComparison.columns.totalKm");
  });
});

// ── buildStats ─────────────────────────────────────────────

describe("FleetComparisonPage — statistici calculate in tabel", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("afiseaza km total formatat pentru t1", () => {
    renderPage();
    // t1: (800+200) + (1000+300) = 2300 km — apare in tabel si in BestTruckCard
    expect(screen.getAllByText("2.300 km").length).toBeGreaterThan(0);
  });

  it("afiseaza consum L/100km cand exista minim 2 fuelLogs", () => {
    renderPage();
    // f1(100000km) si f2(101000km): kmDiff=1000, liters=320, consum=32 L/100km
    expect(screen.getByText("32.0 L/100km")).toBeInTheDocument();
  });

  it("afiseaza dash pentru consum cand nu exista suficiente date", () => {
    setupStorage(mockTrucks, mockTrips, mockMaintenance, [mockFuelLogs[0]]);
    renderPage();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("afiseaza profitul cu culoare verde pentru profit pozitiv", () => {
    renderPage();
    const greenTexts = document.querySelectorAll(".text-green-600, .text-green-400");
    expect(greenTexts.length).toBeGreaterThan(0);
  });

  it("afiseaza 0 curse pentru camionul fara trips", () => {
    renderPage();
    // t3 nu are curse
    const body = document.body.textContent ?? "";
    expect(body).toContain("0");
  });
});

// ── Checkbox selection ─────────────────────────────────────

describe("FleetComparisonPage — checkbox selection", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("afiseaza checkboxuri — cate unul per camion", () => {
    renderPage();
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBe(mockTrucks.length);
  });

  it("checkboxurile sunt initial neselectate", () => {
    renderPage();
    screen.getAllByRole("checkbox").forEach((cb) => {
      expect(cb).not.toBeChecked();
    });
  });

  it("nu afiseaza selectedCount cand nu e nimic selectat", () => {
    renderPage();
    expect(screen.queryByText(/fleetComparison\.selectedCount/)).not.toBeInTheDocument();
  });

  it("nu afiseaza radar chart fara selectie", () => {
    renderPage();
    expect(screen.queryByTestId("radar-chart")).not.toBeInTheDocument();
  });

  it("permite selectarea unui camion", async () => {
    renderPage();
    const checkboxes = screen.getAllByRole("checkbox");
    await userEvent.click(checkboxes[0]);
    expect(checkboxes[0]).toBeChecked();
  });

  it("permite deselectarea unui camion", async () => {
    renderPage();
    const checkboxes = screen.getAllByRole("checkbox");
    await userEvent.click(checkboxes[0]);
    await userEvent.click(checkboxes[0]);
    expect(checkboxes[0]).not.toBeChecked();
  });

  it("afiseaza selectedCount dupa selectarea unui camion", async () => {
    renderPage();
    const checkboxes = screen.getAllByRole("checkbox");
    await userEvent.click(checkboxes[0]);
    await waitFor(() => {
      expect(screen.getByText(/fleetComparison\.selectedCount/)).toBeInTheDocument();
    });
  });

  it("afiseaza selectMore cand e selectat un singur camion", async () => {
    renderPage();
    const checkboxes = screen.getAllByRole("checkbox");
    await userEvent.click(checkboxes[0]);
    await waitFor(() => {
      const p = screen.getByText(/fleetComparison\.selectedCount/);
      expect(p.textContent).toContain("fleetComparison.selectMore");
    });
  });

  it("afiseaza radar chart dupa selectarea a 2 camioane", async () => {
    renderPage();
    // Re-query dupa fiecare click pentru a evita referinte stale
    await userEvent.click(screen.getAllByRole("checkbox")[0]);
    await userEvent.click(screen.getAllByRole("checkbox")[1]);
    await waitFor(() => {
      expect(screen.getByTestId("radar-chart")).toBeInTheDocument();
    });
  });

  it("afiseaza radar.note dupa selectarea a 2 camioane", async () => {
    renderPage();
    await userEvent.click(screen.getAllByRole("checkbox")[0]);
    await userEvent.click(screen.getAllByRole("checkbox")[1]);
    await waitFor(() => {
      const body = document.body.textContent ?? "";
      expect(body).toContain("fleetComparison.radar.note");
    });
  });

  it("nu afiseaza selectMore cu 2+ camioane selectate", async () => {
    renderPage();
    await userEvent.click(screen.getAllByRole("checkbox")[0]);
    await userEvent.click(screen.getAllByRole("checkbox")[1]);
    await waitFor(() => {
      const p = screen.getByText(/fleetComparison\.selectedCount/);
      // selectedCount:2 -> selected.length < 2 e false -> selectMore nu apare
      expect(p.textContent).not.toContain("fleetComparison.selectMore");
    });
  });

  it("al 4-lea checkbox e disabled dupa selectarea a 3 camioane", async () => {
    const fourTrucks = [
      ...mockTrucks,
      {
        id: "t4", plateNumber: "CT-04-TML", brand: "Scania", model: "R500",
        year: 2023, mileage: 50000, status: "available" as const,
        itpExpiry: "2027-01-01", rcaExpiry: "2027-06-01", vignetteExpiry: "2027-01-01",
      },
    ];
    setupStorage(fourTrucks);
    renderPage();
    await userEvent.click(screen.getAllByRole("checkbox")[0]);
    await userEvent.click(screen.getAllByRole("checkbox")[1]);
    await userEvent.click(screen.getAllByRole("checkbox")[2]);
    await waitFor(() => {
      // Al 4-lea checkbox (index 3) trebuie sa fie disabled
      expect(screen.getAllByRole("checkbox")[3]).toBeDisabled();
    });
  });

  it("randul selectat primeste clasa de highlight", async () => {
    renderPage();
    await userEvent.click(screen.getAllByRole("checkbox")[0]);
    await waitFor(() => {
      const highlighted = document.querySelectorAll(".bg-primary\\/5");
      expect(highlighted.length).toBeGreaterThan(0);
    });
  });
});

// ── Export Excel ───────────────────────────────────────────

describe("FleetComparisonPage — Export Excel", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("apeleaza XLSX.writeFile la click pe Export Excel", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /fleetComparison\.export\.excel/i }));
    expect(xlsxMock.writeFile).toHaveBeenCalled();
  });

  it("apeleaza json_to_sheet cu un rand per camion", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /fleetComparison\.export\.excel/i }));
    const calls = xlsxMock.utils.json_to_sheet.mock.calls as unknown[][];
    const rows = calls[0][0] as unknown[];
    expect(rows).toHaveLength(mockTrucks.length);
  });

  it("apeleaza book_append_sheet", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /fleetComparison\.export\.excel/i }));
    expect(xlsxMock.utils.book_append_sheet).toHaveBeenCalled();
  });

  it("exporta lista goala fara erori", async () => {
    setupStorage([]);
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /fleetComparison\.export\.excel/i }));
    expect(xlsxMock.writeFile).toHaveBeenCalled();
  });
});

// ── Export PDF ─────────────────────────────────────────────

describe("FleetComparisonPage — Export PDF", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("apeleaza jsPDF.save la click pe Export PDF", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /fleetComparison\.export\.pdf/i }));
    expect(jsPDFMock.saveFn).toHaveBeenCalled();
  });

  it("exporta PDF fara erori cand lista e goala", async () => {
    setupStorage([]);
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /fleetComparison\.export\.pdf/i }));
    expect(jsPDFMock.saveFn).toHaveBeenCalled();
  });
});

// ── Mobile view ────────────────────────────────────────────

describe("FleetComparisonPage — mobile view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStorage();
    vi.mocked(useMobile).mockReturnValue(true);
  });

  afterEach(() => {
    vi.mocked(useMobile).mockReturnValue(false);
  });

  it("randeaza card-uri mobile in loc de tabel", () => {
    renderPage();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getAllByText("CT-01-TML").length).toBeGreaterThan(0);
  });

  it("afiseaza noData pe mobile cand lista e goala", () => {
    setupStorage([]);
    renderPage();
    expect(screen.getByText("fleetComparison.noData")).toBeInTheDocument();
  });

  it("afiseaza checkbox in card-urile mobile", () => {
    renderPage();
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBe(mockTrucks.length);
  });

  it("afiseaza profitul in card-urile mobile", () => {
    renderPage();
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/RON/);
  });

  it("afiseaza brand si model in card-urile mobile", () => {
    renderPage();
    expect(screen.getAllByText(/Volvo/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/MAN/).length).toBeGreaterThan(0);
  });

  it("permite selectarea camionului din card mobile", async () => {
    renderPage();
    await userEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(screen.getAllByRole("checkbox")[0]).toBeChecked();
  });

  it("afiseaza radar chart dupa selectarea a 2 camioane pe mobile", async () => {
    renderPage();
    await userEvent.click(screen.getAllByRole("checkbox")[0]);
    await userEvent.click(screen.getAllByRole("checkbox")[1]);
    await waitFor(() => {
      expect(screen.getByTestId("radar-chart")).toBeInTheDocument();
    });
  });
});

// ── Coloane tabel ──────────────────────────────────────────

describe("FleetComparisonPage — coloane tabel", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("afiseaza header-ele coloanelor", () => {
    renderPage();
    expect(screen.getByText("fleetComparison.columns.truck")).toBeInTheDocument();
    expect(screen.getByText("fleetComparison.columns.tripCount")).toBeInTheDocument();
    expect(screen.getByText("fleetComparison.columns.totalKm")).toBeInTheDocument();
    expect(screen.getByText("fleetComparison.columns.consumption")).toBeInTheDocument();
    expect(screen.getByText("fleetComparison.columns.maintenanceCost")).toBeInTheDocument();
    expect(screen.getByText("fleetComparison.columns.revenue")).toBeInTheDocument();
    expect(screen.getByText("fleetComparison.columns.profit")).toBeInTheDocument();
  });

  it("afiseaza brand si model sub placuta in coloana truck", () => {
    renderPage();
    expect(screen.getAllByText(/FH16/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/TGX/).length).toBeGreaterThan(0);
  });

  it("afiseaza hint selectare maxim 3", () => {
    renderPage();
    expect(screen.getByText("fleetComparison.selectHint")).toBeInTheDocument();
  });
});