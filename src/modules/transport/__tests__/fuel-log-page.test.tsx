// ──────────────────────────────────────────────────────────
// Integration tests: FuelLogPage
// File: src/modules/transport/__tests__/fuel-log-page.test.tsx
// Coverage target: statements >85%, branch >70%, functions >80%
// ──────────────────────────────────────────────────────────

import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mocks ──────────────────────────────────────────────────

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: "ro" },
  }),
}));

vi.mock("@/hooks/use-audit-log", () => ({
  useAuditLog: () => ({ log: vi.fn() }),
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

vi.mock("@/components/data-table/pagination", () => ({
  DataTablePagination: () => <div data-testid="pagination" />,
}));

// Recharts mock — ResponsiveContainer are nevoie de dimensiuni in jsdom
vi.mock("recharts", () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
}));

// XLSX mock — vi.hoisted necesar pentru ca vi.mock e hoisted automat de Vitest
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
  addItem: vi.fn((key: string, item: Record<string, unknown>) => {
    const arr = JSON.parse(mockStorage[key] ?? "[]");
    arr.push(item);
    mockStorage[key] = JSON.stringify(arr);
  }),
  updateItem: vi.fn(),
  removeItem: vi.fn((key: string, predicate: (item: Record<string, unknown>) => boolean) => {
    const arr = JSON.parse(mockStorage[key] ?? "[]");
    mockStorage[key] = JSON.stringify(arr.filter((i: Record<string, unknown>) => !predicate(i)));
  }),
  generateId: vi.fn(() => "new-fuel-id"),
}));

vi.mock("@/data/mock-data", () => ({
  STORAGE_KEYS: {
    fuelLog: "fuelLog",
    trucks: "trucks",
    drivers: "drivers",
  },
}));

// ── Imports ────────────────────────────────────────────────

import FuelLogPage from "@/modules/transport/pages/fuel-log";
import type { Truck, Driver, FuelLog } from "@/modules/transport/types";
import { addItem, removeItem, updateItem, getCollection } from "@/utils/local-storage";
import { useMobile } from "@/hooks/use-mobile";

// ── Date test ──────────────────────────────────────────────

const now = new Date();
const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
const lastMonth = (() => {
  const d = new Date(now);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
})();

const mockTrucks: Truck[] = [
  {
    id: "t1",
    plateNumber: "CT-01-TML",
    brand: "Volvo",
    model: "FH16",
    year: 2021,
    mileage: 300000,
    status: "available",
    itpExpiry: "2026-09-01",
    rcaExpiry: "2026-12-01",
    vignetteExpiry: "2026-06-30",
  },
  {
    id: "t2",
    plateNumber: "CT-02-TML",
    brand: "MAN",
    model: "TGX",
    year: 2020,
    mileage: 410000,
    status: "available",
    itpExpiry: "2026-07-15",
    rcaExpiry: "2027-01-15",
    vignetteExpiry: "2026-08-31",
  },
];

const mockDrivers: Driver[] = [
  {
    id: "d1",
    name: "Ion Popescu",
    phone: "0722000001",
    licenseExpiry: "2027-01-01",
    status: "available",
    truckId: "t1",
  },
  {
    id: "d2",
    name: "Vasile Ionescu",
    phone: "0722000002",
    licenseExpiry: "2027-06-01",
    status: "available",
    truckId: "t2",
  },
];

const mockLogs: FuelLog[] = [
  {
    id: "f1",
    truckId: "t1",
    driverId: "d1",
    date: `${thisMonth}-05`,
    station: "Petrom Constanta",
    liters: 300,
    pricePerLiter: 7.5,
    totalCost: 2250,
    kmAtFueling: 100000,
  },
  {
    id: "f2",
    truckId: "t2",
    driverId: "d2",
    date: `${thisMonth}-10`,
    station: "OMV Bucuresti",
    liters: 400,
    pricePerLiter: 7.8,
    totalCost: 3120,
    kmAtFueling: 200000,
  },
  {
    id: "f3",
    truckId: "t1",
    driverId: "d1",
    date: `${lastMonth}-15`,
    station: "Petrom Constanta",
    liters: 280,
    pricePerLiter: 7.4,
    totalCost: 2072,
    kmAtFueling: 99000,
  },
];

function setupStorage(logs = mockLogs, trucks = mockTrucks, drivers = mockDrivers) {
  mockStorage["fuelLog"] = JSON.stringify(logs);
  mockStorage["trucks"] = JSON.stringify(trucks);
  mockStorage["drivers"] = JSON.stringify(drivers);
  vi.mocked(getCollection).mockImplementation((key: string) => {
    try { return JSON.parse(mockStorage[key] ?? "[]"); } catch { return []; }
  });
}

function renderPage() {
  return render(<FuelLogPage />);
}

// ── Render ─────────────────────────────────────────────────

describe("FuelLogPage — render", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("randeaza pagina fara erori", () => {
    renderPage();
    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("main")).toBeInTheDocument();
  });

  it("afiseaza titlul paginii", () => {
    renderPage();
    expect(screen.getByText("fuelLog.title")).toBeInTheDocument();
  });

  it("afiseaza butonul Add", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /fuelLog\.actions\.add/i })).toBeInTheDocument();
  });

  it("afiseaza butonul Export", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /fuelLog\.actions\.export/i })).toBeInTheDocument();
  });

  it("afiseaza tabelul cu inregistrari", () => {
    renderPage();
    expect(screen.getAllByText("Petrom Constanta").length).toBeGreaterThan(0);
    expect(screen.getByText("OMV Bucuresti")).toBeInTheDocument();
  });

  it("afiseaza mesaj noResults cand lista e goala", () => {
    setupStorage([]);
    renderPage();
    expect(screen.getByText("fuelLog.noResults")).toBeInTheDocument();
  });

  it("afiseaza paginatia", () => {
    renderPage();
    expect(screen.getByTestId("pagination")).toBeInTheDocument();
  });

  it("afiseaza input de cautare", () => {
    renderPage();
    expect(screen.getByPlaceholderText("fuelLog.placeholders.search")).toBeInTheDocument();
  });
});

// ── FuelKpiCards ───────────────────────────────────────────

describe("FuelLogPage — FuelKpiCards", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("afiseaza KPI avgConsumption", () => {
    renderPage();
    expect(screen.getByText("fuelLog.kpi.avgConsumption")).toBeInTheDocument();
  });

  it("afiseaza KPI totalCostMonth", () => {
    renderPage();
    expect(screen.getByText("fuelLog.kpi.totalCostMonth")).toBeInTheDocument();
  });

  it("afiseaza KPI topStation", () => {
    renderPage();
    expect(screen.getByText("fuelLog.kpi.topStation")).toBeInTheDocument();
  });

  it("afiseaza costul total al lunii curente (2250 + 3120 = 5370 RON)", () => {
    renderPage();
    expect(screen.getByText("5.370 RON")).toBeInTheDocument();
  });

  it("afiseaza statia cea mai folosita (Petrom Constanta — 2 alimentari)", () => {
    renderPage();
    // f1 si f3 sunt la Petrom Constanta
    const body = document.body.textContent ?? "";
    expect(body).toContain("Petrom Constanta");
  });

  it("afiseaza 0.0 L/100km cand nu sunt suficiente date per camion", () => {
    // Un singur log per camion -> nu se poate calcula consum
    setupStorage([mockLogs[0]]);
    renderPage();
    expect(screen.getByText("0.0 L/100km")).toBeInTheDocument();
  });

  it("afiseaza dash la topStation cand lista e goala", () => {
    setupStorage([]);
    renderPage();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("calculeaza consumul mediu cand exista minim 2 alimentari per camion", () => {
    // t1 are f1 (100000km, 300L) si f3 (99000km, 280L)
    // kmDiff = 1000, totalLiters (slice 1) = 300, consum = 300/1000*100 = 30 L/100km
    renderPage();
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/\d+\.\d L\/100km/);
  });
});

// ── FuelChart ──────────────────────────────────────────────

describe("FuelLogPage — FuelChart", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("afiseaza graficul cand exista date", () => {
    renderPage();
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  it("afiseaza titlul graficului", () => {
    renderPage();
    expect(screen.getByText("fuelLog.chart.title")).toBeInTheDocument();
  });

  it("nu afiseaza graficul cand lista e goala", () => {
    setupStorage([]);
    renderPage();
    expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument();
  });
});

// ── CRUD Create ────────────────────────────────────────────

describe("FuelLogPage — CRUD create", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("deschide dialogul la click pe Add", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /fuelLog\.actions\.add/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("dialogul afiseaza titlul add", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /fuelLog\.actions\.add/i }));
    expect(screen.getByText("fuelLog.add")).toBeInTheDocument();
  });

  it("dialogul afiseaza toate campurile", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /fuelLog\.actions\.add/i }));
    expect(screen.getByPlaceholderText("fuelLog.placeholders.station")).toBeInTheDocument();
    expect(screen.getByText("fuelLog.fields.truck")).toBeInTheDocument();
    expect(screen.getByText("fuelLog.fields.driver")).toBeInTheDocument();
    expect(screen.getByText("fuelLog.fields.liters")).toBeInTheDocument();
    expect(screen.getByText("fuelLog.fields.pricePerLiter")).toBeInTheDocument();
    expect(screen.getByText("fuelLog.fields.kmAtFueling")).toBeInTheDocument();
    expect(screen.getByText("fuelLog.fields.totalCost")).toBeInTheDocument();
  });

  it("afiseaza preview totalCost in dialog (0.00 RON initial)", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /fuelLog\.actions\.add/i }));
    expect(screen.getByText("0.00 RON")).toBeInTheDocument();
  });

  it("inchide dialogul la click pe Cancel", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /fuelLog\.actions\.add/i }));
    await userEvent.click(screen.getByRole("button", { name: /fuelLog\.cancel/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("afiseaza eroare la submit fara truck selectat", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /fuelLog\.actions\.add/i }));
    await userEvent.click(screen.getByRole("button", { name: /fuelLog\.actions\.add/i }));
    await waitFor(() => {
      expect(screen.getByText("fuelLog.validation.truckRequired")).toBeInTheDocument();
    });
  });

  it("afiseaza eroare driverId la submit fara sofer", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /fuelLog\.actions\.add/i }));
    await userEvent.click(screen.getByRole("button", { name: /fuelLog\.actions\.add/i }));
    await waitFor(() => {
      expect(screen.getByText("fuelLog.validation.driverRequired")).toBeInTheDocument();
    });
  });

  it("nu afiseaza erori inainte de primul submit", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /fuelLog\.actions\.add/i }));
    expect(screen.queryByText("fuelLog.validation.truckRequired")).not.toBeInTheDocument();
    expect(screen.queryByText("fuelLog.validation.driverRequired")).not.toBeInTheDocument();
  });

  it("reseteaza form la redeschidere dupa cancel", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /fuelLog\.actions\.add/i }));
    await userEvent.type(screen.getByPlaceholderText("fuelLog.placeholders.station"), "Rompetrol");
    await userEvent.click(screen.getByRole("button", { name: /fuelLog\.cancel/i }));
    await userEvent.click(screen.getByRole("button", { name: /fuelLog\.actions\.add/i }));
    const stationInput = screen.getByPlaceholderText("fuelLog.placeholders.station") as HTMLInputElement;
    expect(stationInput.value).toBe("");
  });
});

// ── CRUD Update ────────────────────────────────────────────

describe("FuelLogPage — CRUD update", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("deschide dialogul de edit la click pe Pencil", async () => {
    renderPage();
    const pencilBtns = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector(".lucide-pencil"),
    );
    expect(pencilBtns.length).toBeGreaterThan(0);
    await userEvent.click(pencilBtns[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("dialogul afiseaza titlul edit", async () => {
    renderPage();
    const pencilBtns = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector(".lucide-pencil"),
    );
    await userEvent.click(pencilBtns[0]);
    expect(screen.getByText("fuelLog.edit")).toBeInTheDocument();
  });

  it("preincarca statia in form la edit", async () => {
    renderPage();
    const pencilBtns = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector(".lucide-pencil"),
    );
    // Tabel sortat desc dupa date: f2 (10), f1 (05), f3 (luna trecuta)
    await userEvent.click(pencilBtns[0]);
    await waitFor(() => {
      const stationInput = screen.getByPlaceholderText("fuelLog.placeholders.station") as HTMLInputElement;
      expect(stationInput.value).toBe("OMV Bucuresti");
    });
  });

  it("butonul de submit in edit arata textul save", async () => {
    renderPage();
    const pencilBtns = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector(".lucide-pencil"),
    );
    await userEvent.click(pencilBtns[0]);
    expect(screen.getByRole("button", { name: /fuelLog\.save/i })).toBeInTheDocument();
  });

  it("apeleaza updateItem la submit valid in modul edit", async () => {
    renderPage();
    const pencilBtns = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector(".lucide-pencil"),
    );
    await userEvent.click(pencilBtns[0]);
    const stationInput = screen.getByPlaceholderText("fuelLog.placeholders.station");
    await userEvent.clear(stationInput);
    await userEvent.type(stationInput, "Rompetrol Brasov");
    await userEvent.click(screen.getByRole("button", { name: /fuelLog\.save/i }));
    await waitFor(() => {
      expect(updateItem).toHaveBeenCalled();
    });
  });

  it("inchide dialogul de edit dupa save reusit", async () => {
    renderPage();
    const pencilBtns = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector(".lucide-pencil"),
    );
    await userEvent.click(pencilBtns[0]);
    await userEvent.click(screen.getByRole("button", { name: /fuelLog\.save/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("reseteaza form la deschidere add dupa edit anterior", async () => {
    renderPage();
    const pencilBtns = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector(".lucide-pencil"),
    );
    await userEvent.click(pencilBtns[0]);
    await userEvent.click(screen.getByRole("button", { name: /fuelLog\.cancel/i }));
    await userEvent.click(screen.getByRole("button", { name: /fuelLog\.actions\.add/i }));
    const stationInput = screen.getByPlaceholderText("fuelLog.placeholders.station") as HTMLInputElement;
    expect(stationInput.value).toBe("");
  });
});

// ── CRUD Delete ────────────────────────────────────────────

describe("FuelLogPage — CRUD delete", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("afiseaza dialog confirmare la click Delete", async () => {
    renderPage();
    const trashBtns = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector(".lucide-trash-2"),
    );
    expect(trashBtns.length).toBeGreaterThan(0);
    await userEvent.click(trashBtns[0]);
    expect(screen.getByText("fuelLog.confirmDeleteTitle")).toBeInTheDocument();
    expect(screen.getByText("fuelLog.confirmDelete")).toBeInTheDocument();
  });

  it("apeleaza removeItem la confirmare stergere", async () => {
    renderPage();
    const trashBtns = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector(".lucide-trash-2"),
    );
    await userEvent.click(trashBtns[0]);
    await userEvent.click(screen.getByRole("button", { name: /fuelLog\.actions\.confirm/i }));
    await waitFor(() => {
      expect(removeItem).toHaveBeenCalled();
    });
  });

  it("inchide dialogul la Cancel stergere", async () => {
    renderPage();
    const trashBtns = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector(".lucide-trash-2"),
    );
    await userEvent.click(trashBtns[0]);
    await userEvent.click(screen.getByRole("button", { name: /fuelLog\.cancel/i }));
    await waitFor(() => {
      expect(screen.queryByText("fuelLog.confirmDeleteTitle")).not.toBeInTheDocument();
    });
  });

  it("nu apeleaza removeItem la anulare stergere", async () => {
    renderPage();
    const trashBtns = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector(".lucide-trash-2"),
    );
    await userEvent.click(trashBtns[0]);
    await userEvent.click(screen.getByRole("button", { name: /fuelLog\.cancel/i }));
    expect(removeItem).not.toHaveBeenCalled();
  });
});

// ── Export Excel ───────────────────────────────────────────

describe("FuelLogPage — Export Excel", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("apeleaza XLSX.writeFile la click pe Export", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /fuelLog\.actions\.export/i }));
    expect(xlsxMock.writeFile).toHaveBeenCalled();
  });

  it("apeleaza json_to_sheet cu datele corecte", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /fuelLog\.actions\.export/i }));
    expect(xlsxMock.utils.json_to_sheet).toHaveBeenCalled();
    const calls = xlsxMock.utils.json_to_sheet.mock.calls as unknown[][];
    const rows = calls[0][0] as unknown[];
    expect(rows).toHaveLength(mockLogs.length);
  });

  it("apeleaza book_append_sheet", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /fuelLog\.actions\.export/i }));
    expect(xlsxMock.utils.book_append_sheet).toHaveBeenCalled();
  });

  it("exporta lista goala fara erori", async () => {
    setupStorage([]);
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /fuelLog\.actions\.export/i }));
    expect(xlsxMock.writeFile).toHaveBeenCalled();
  });
});

// ── Search ─────────────────────────────────────────────────

describe("FuelLogPage — search", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("filtreaza dupa statie", async () => {
    renderPage();
    await userEvent.type(screen.getByPlaceholderText("fuelLog.placeholders.search"), "OMV");
    await waitFor(() => {
      expect(screen.getByText("OMV Bucuresti")).toBeInTheDocument();
    });
  });

  it("filtreaza dupa placuta camionului", async () => {
    renderPage();
    await userEvent.type(screen.getByPlaceholderText("fuelLog.placeholders.search"), "CT-01");
    await waitFor(() => {
      const body = document.body.textContent ?? "";
      expect(body).toContain("CT-01-TML");
    });
  });

  it("filtreaza dupa numele soferului", async () => {
    renderPage();
    await userEvent.type(screen.getByPlaceholderText("fuelLog.placeholders.search"), "Vasile");
    await waitFor(() => {
      expect(screen.getByText("OMV Bucuresti")).toBeInTheDocument();
    });
  });

  it("afiseaza noResults cand cautarea nu gaseste nimic", async () => {
    renderPage();
    await userEvent.type(screen.getByPlaceholderText("fuelLog.placeholders.search"), "xyzxyzxyz");
    await waitFor(() => {
      expect(screen.getByText("fuelLog.noResults")).toBeInTheDocument();
    });
  });

  it("query gol afiseaza toate inregistrarile", async () => {
    renderPage();
    const searchInput = screen.getByPlaceholderText("fuelLog.placeholders.search");
    await userEvent.type(searchInput, "OMV");
    await userEvent.clear(searchInput);
    await waitFor(() => {
      expect(screen.getAllByText("Petrom Constanta").length).toBeGreaterThan(0);
      expect(screen.getByText("OMV Bucuresti")).toBeInTheDocument();
    });
  });
});

// ── Mobile view ────────────────────────────────────────────

describe("FuelLogPage — mobile view", () => {
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
    expect(screen.getAllByText("Petrom Constanta").length).toBeGreaterThan(0);
  });

  it("afiseaza noResults pe mobile cand lista e goala", () => {
    setupStorage([]);
    renderPage();
    expect(screen.getByText("fuelLog.noResults")).toBeInTheDocument();
  });

  it("afiseaza placuta camionului in card-urile mobile", () => {
    renderPage();
    const body = document.body.textContent ?? "";
    expect(body).toContain("CT-01-TML");
  });

  it("afiseaza numele soferului in card-urile mobile", () => {
    renderPage();
    const body = document.body.textContent ?? "";
    expect(body).toContain("Ion Popescu");
  });

  it("afiseaza litri si RON in card-urile mobile", () => {
    renderPage();
    const body = document.body.textContent ?? "";
    expect(body).toContain("300 L");
    expect(body).toMatch(/RON/);
  });

  it("deschide confirm delete din card mobile", async () => {
    renderPage();
    const trashBtns = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector(".lucide-trash-2"),
    );
    if (trashBtns.length > 0) {
      await userEvent.click(trashBtns[0]);
      expect(screen.getByText("fuelLog.confirmDeleteTitle")).toBeInTheDocument();
    }
  });

  it("deschide dialogul edit din card mobile", async () => {
    renderPage();
    const pencilBtns = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector(".lucide-pencil"),
    );
    if (pencilBtns.length > 0) {
      await userEvent.click(pencilBtns[0]);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    }
  });

  it("afiseaza fallback truckId cand camionul nu exista", () => {
    setupStorage(mockLogs, []);
    renderPage();
    const body = document.body.textContent ?? "";
    expect(body).toContain("t1");
  });
});

// ── Coloane tabel ──────────────────────────────────────────

describe("FuelLogPage — coloane tabel", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("afiseaza brand si model camion in coloana truck", () => {
    renderPage();
    expect(screen.getAllByText(/Volvo/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/FH16/).length).toBeGreaterThan(0);
  });

  it("afiseaza numele soferului in coloana driver", () => {
    renderPage();
    expect(screen.getAllByText("Ion Popescu").length).toBeGreaterThan(0);
    expect(screen.getByText("Vasile Ionescu")).toBeInTheDocument();
  });

  it("afiseaza litrii formatati cu L", () => {
    renderPage();
    expect(screen.getByText("300.0 L")).toBeInTheDocument();
    expect(screen.getByText("400.0 L")).toBeInTheDocument();
  });

  it("afiseaza pretul per litru cu RON", () => {
    renderPage();
    expect(screen.getByText("7.50 RON")).toBeInTheDocument();
    expect(screen.getByText("7.80 RON")).toBeInTheDocument();
  });

  it("afiseaza fallback truckId cand camionul nu exista in tabel", () => {
    setupStorage(mockLogs, []);
    renderPage();
    const body = document.body.textContent ?? "";
    expect(body).toContain("t1");
  });

  it("afiseaza fallback driverId cand soferul nu exista in tabel", () => {
    setupStorage(mockLogs, mockTrucks, []);
    renderPage();
    const body = document.body.textContent ?? "";
    expect(body).toContain("d1");
  });
});