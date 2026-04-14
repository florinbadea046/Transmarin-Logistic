// @vitest-environment happy-dom

// ──────────────────────────────────────────────────────────
// Integration tests: Mileage Registry page
// File: src/modules/transport/pages/mileage-registry.tsx
//
// Ce trebuie testat:
// - Render — afiseaza tabel cu intrari kilometraj per camion
// - buildRows() — construieste corect randurile din date brute
// - buildChartData() — genereaza date corecte pentru grafic
// - handleSave() — salveaza km start/end, calculeaza diferenta
// - Validare — km_end > km_start, data format corect
// - Alerte — semnaleaza discrepante km
// - Export — genereaza PDF/Excel corect
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as React from "react";

// ─── Mock-uri globale ──────────────────────────────────────

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/hooks/use-audit-log", () => ({
  useAuditLog: () => ({ log: vi.fn() }),
}));

vi.mock("@/components/layout/header", () => ({
  Header: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/layout/main", () => ({
  Main: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/data-table/pagination", () => ({
  DataTablePagination: () => <div data-testid="pagination" />,
}));

vi.mock("../pages/_components/mileage-registry-chart", () => ({
  MileageChart: () => <div data-testid="mileage-chart" />,
}));

vi.mock("../pages/_components/mileage-registry-mobile-card", () => ({
  MileageMobileCard: ({
    row,
    onEdit,
  }: {
    row: { truck: { plateNumber: string } };
    onEdit: (row: unknown) => void;
  }) => (
    <div data-testid={`mobile-card-${row.truck.plateNumber}`}>
      <button onClick={() => onEdit(row)}>
        mileageRegistry.actions.update
      </button>
    </div>
  ),
}));

vi.mock("xlsx", () => ({
  utils: {
    aoa_to_sheet: vi.fn().mockReturnValue({}),
    book_new: vi.fn().mockReturnValue({}),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

vi.mock("@/data/mock-data", () => ({
  STORAGE_KEYS: {
    trucks: "transmarin_trucks",
    trips: "transmarin_trips",
  },
}));

const mockGetCollection = vi.fn();
const mockUpdateItem = vi.fn();
vi.mock("@/utils/local-storage", () => ({
  getCollection: (...args: unknown[]) => mockGetCollection(...args),
  updateItem: (...args: unknown[]) => mockUpdateItem(...args),
}));

// ─── localStorage mock ─────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

// ─── Date de test ──────────────────────────────────────────

import type { Truck, Trip } from "@/modules/transport/types";
import MileageRegistryPage from "../pages/mileage-registry";

const sampleTruck: Truck = {
  id: "trk-1",
  plateNumber: "B-123-ABC",
  brand: "Volvo",
  model: "FH",
  year: 2020,
  mileage: 100000,
  status: "available",
  itpExpiry: "2026-01-01",
  rcaExpiry: "2026-01-01",
  vignetteExpiry: "2026-01-01",
};

const sampleTruck2: Truck = {
  id: "trk-2",
  plateNumber: "CJ-456-DEF",
  brand: "DAF",
  model: "XF",
  year: 2019,
  mileage: 200000,
  status: "available",
  itpExpiry: "2026-01-01",
  rcaExpiry: "2026-01-01",
  vignetteExpiry: "2026-01-01",
};

const currentMonth = new Date().toISOString().slice(0, 7);

const sampleTrip: Trip = {
  id: "trip-1",
  orderId: "ord-1",
  driverId: "drv-1",
  truckId: "trk-1",
  departureDate: `${currentMonth}-05`,
  estimatedArrivalDate: `${currentMonth}-06`,
  kmLoaded: 300,
  kmEmpty: 50,
  fuelCost: 450,
  status: "planned",
};

function setupMocks(trucks: Truck[] = [], trips: Trip[] = []) {
  mockGetCollection.mockImplementation((key: string) => {
    if (key === "transmarin_trucks") return trucks;
    if (key === "transmarin_trips") return trips;
    return [];
  });
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

// ─── Helper: deschide dialogul de editare ─────────────────

async function openEditDialog(trucks: Truck[] = [sampleTruck]) {
  setupMocks(trucks);
  render(<MileageRegistryPage />);
  await waitFor(() => screen.getByText("mileageRegistry.actions.update"));
  fireEvent.click(screen.getAllByText("mileageRegistry.actions.update")[0]);
  await waitFor(() =>
    screen.getByText("mileageRegistry.dialog.title — B-123-ABC"),
  );
}

// ─── Setup global ──────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
  setDesktop();
});

afterEach(() => {
  setDesktop();
});

// ─── Render initial ────────────────────────────────────────
describe("MileageRegistryPage — render initial", () => {
  it("afiseaza titlul paginii", () => {
    setupMocks();
    render(<MileageRegistryPage />);
    expect(screen.getByText("mileageRegistry.title")).toBeTruthy();
  });

  it("afiseaza KPI-urile: totalKm, avgDaily, alerts", () => {
    setupMocks();
    render(<MileageRegistryPage />);
    expect(screen.getByText("mileageRegistry.kpi.totalKm")).toBeTruthy();
    expect(screen.getByText("mileageRegistry.kpi.avgDaily")).toBeTruthy();
    expect(screen.getByText("mileageRegistry.kpi.alerts")).toBeTruthy();
  });

  it("afiseaza graficul", () => {
    setupMocks();
    render(<MileageRegistryPage />);
    expect(screen.getByTestId("mileage-chart")).toBeTruthy();
  });

  it("afiseaza titlul tabelului", () => {
    setupMocks();
    render(<MileageRegistryPage />);
    expect(screen.getByText("mileageRegistry.tableTitle")).toBeTruthy();
  });

  it("afiseaza butonul export", () => {
    setupMocks();
    render(<MileageRegistryPage />);
    expect(screen.getByText("mileageRegistry.actions.export")).toBeTruthy();
  });

  it("afiseaza mesaj noResults cand nu sunt camioane", () => {
    setupMocks([]);
    render(<MileageRegistryPage />);
    expect(screen.getByText("mileageRegistry.noResults")).toBeTruthy();
  });

  it("nu afiseaza alerta de discrepanta cand nu sunt date", () => {
    setupMocks([]);
    render(<MileageRegistryPage />);
    expect(screen.queryByText("mileageRegistry.alert.discrepancy")).toBeNull();
  });
});

// ─── Render cu date ────────────────────────────────────────
describe("MileageRegistryPage — render cu camioane", () => {
  it("afiseaza camionul in tabel", async () => {
    setupMocks([sampleTruck]);
    render(<MileageRegistryPage />);
    await waitFor(() => {
      expect(screen.getByText("B-123-ABC")).toBeTruthy();
    });
  });

  it("afiseaza butonul de editare pentru fiecare camion", async () => {
    setupMocks([sampleTruck]);
    render(<MileageRegistryPage />);
    await waitFor(() => {
      expect(screen.getByText("mileageRegistry.actions.update")).toBeTruthy();
    });
  });

  it("afiseaza mai multe camioane", async () => {
    setupMocks([sampleTruck, sampleTruck2]);
    render(<MileageRegistryPage />);
    await waitFor(() => {
      expect(screen.getByText("B-123-ABC")).toBeTruthy();
      expect(screen.getByText("CJ-456-DEF")).toBeTruthy();
    });
  });

  it("afiseaza KPI totalKm prezent", async () => {
    setupMocks([sampleTruck]);
    render(<MileageRegistryPage />);
    await waitFor(() => {
      expect(screen.getByText("mileageRegistry.kpi.totalKm")).toBeTruthy();
    });
  });
});

// ─── handleEdit — deschide dialogul ───────────────────────
describe("MileageRegistryPage — handleEdit", () => {
  it("click pe update deschide dialogul de editare", async () => {
    await openEditDialog();
    expect(
      screen.getByText("mileageRegistry.dialog.title — B-123-ABC"),
    ).toBeTruthy();
  });

  it("dialogul afiseaza luna selectata", async () => {
    await openEditDialog();
    expect(
      screen.getByText(`mileageRegistry.dialog.month: ${currentMonth}`),
    ).toBeTruthy();
  });

  it("dialogul pre-populeaza kmStart din row", async () => {
    await openEditDialog();
    const kmStartInput = document.getElementById(
      "mr-kmStart",
    ) as HTMLInputElement;
    expect(kmStartInput.value).toBe("100000");
  });

  it("butonul cancel inchide dialogul", async () => {
    await openEditDialog();
    fireEvent.click(screen.getByText("mileageRegistry.cancel"));
    await waitFor(() => {
      expect(
        screen.queryByText("mileageRegistry.dialog.title — B-123-ABC"),
      ).toBeNull();
    });
  });
});

// ─── handleSave — validare ─────────────────────────────────
describe("MileageRegistryPage — handleSave validare", () => {
  it("afiseaza eroare cand kmEnd < kmStart", async () => {
    await openEditDialog();
    const kmStartInput = document.getElementById(
      "mr-kmStart",
    ) as HTMLInputElement;
    const kmEndInput = document.getElementById("mr-kmEnd") as HTMLInputElement;

    fireEvent.change(kmStartInput, { target: { value: "150000" } });
    fireEvent.change(kmEndInput, { target: { value: "100000" } });
    fireEvent.click(screen.getByText("mileageRegistry.save"));

    await waitFor(() => {
      expect(
        screen.getByText("mileageRegistry.validation.kmEndAfterStart"),
      ).toBeTruthy();
    });
  });

  it("afiseaza eroare Zod cand kmStart e negativ", async () => {
    await openEditDialog();
    const kmStartInput = document.getElementById(
      "mr-kmStart",
    ) as HTMLInputElement;
    fireEvent.change(kmStartInput, { target: { value: "-1" } });
    fireEvent.click(screen.getByText("mileageRegistry.save"));

    await waitFor(() => {
      expect(
        screen.getByText("mileageRegistry.validation.kmStartMin"),
      ).toBeTruthy();
    });
  });

  it("salveaza cu succes si inchide dialogul", async () => {
    const { toast } = await import("sonner");
    await openEditDialog();

    const kmStartInput = document.getElementById(
      "mr-kmStart",
    ) as HTMLInputElement;
    const kmEndInput = document.getElementById("mr-kmEnd") as HTMLInputElement;

    fireEvent.change(kmStartInput, { target: { value: "100000" } });
    fireEvent.change(kmEndInput, { target: { value: "105000" } });
    fireEvent.click(screen.getByText("mileageRegistry.save"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("mileageRegistry.toast.saved");
    });
    await waitFor(() => {
      expect(
        screen.queryByText("mileageRegistry.dialog.title — B-123-ABC"),
      ).toBeNull();
    });
  });

  it("apeleaza updateItem cand kmEnd > truck.mileage", async () => {
    await openEditDialog();

    const kmStartInput = document.getElementById(
      "mr-kmStart",
    ) as HTMLInputElement;
    const kmEndInput = document.getElementById("mr-kmEnd") as HTMLInputElement;

    fireEvent.change(kmStartInput, { target: { value: "100000" } });
    fireEvent.change(kmEndInput, { target: { value: "120000" } });
    fireEvent.click(screen.getByText("mileageRegistry.save"));

    await waitFor(() => {
      expect(mockUpdateItem).toHaveBeenCalled();
    });
  });

  it("nu apeleaza updateItem cand kmEnd <= truck.mileage", async () => {
    await openEditDialog();

    const kmStartInput = document.getElementById(
      "mr-kmStart",
    ) as HTMLInputElement;
    const kmEndInput = document.getElementById("mr-kmEnd") as HTMLInputElement;

    fireEvent.change(kmStartInput, { target: { value: "95000" } });
    fireEvent.change(kmEndInput, { target: { value: "99000" } });
    fireEvent.click(screen.getByText("mileageRegistry.save"));

    await waitFor(() => {
      expect(
        screen.queryByText("mileageRegistry.dialog.title — B-123-ABC"),
      ).toBeNull();
    });
    expect(mockUpdateItem).not.toHaveBeenCalled();
  });

  it("afiseaza preview km parcursi cand kmEnd >= kmStart", async () => {
    await openEditDialog();

    const kmStartInput = document.getElementById(
      "mr-kmStart",
    ) as HTMLInputElement;
    const kmEndInput = document.getElementById("mr-kmEnd") as HTMLInputElement;

    fireEvent.change(kmStartInput, { target: { value: "100000" } });
    fireEvent.change(kmEndInput, { target: { value: "105000" } });

    await waitFor(() => {
      expect(screen.getByText("mileageRegistry.dialog.preview")).toBeTruthy();
    });
  });
});

// ─── Alerte discrepanta ────────────────────────────────────
describe("MileageRegistryPage — alerte discrepanta", () => {
  it("afiseaza alerta cand exista discrepanta > 10%", async () => {
    localStorageMock.setItem(
      "transmarin_mileage_entries",
      JSON.stringify([
        {
          truckId: "trk-1",
          month: currentMonth,
          kmStart: 100000,
          kmEnd: 102000,
        },
      ]),
    );
    setupMocks([sampleTruck], []);
    render(<MileageRegistryPage />);

    await waitFor(() => {
      expect(
        screen.getByText("mileageRegistry.alert.discrepancy"),
      ).toBeTruthy();
    });
  });

  it("nu afiseaza alerta cand discrepanta e sub 10%", async () => {
    localStorageMock.setItem(
      "transmarin_mileage_entries",
      JSON.stringify([
        {
          truckId: "trk-1",
          month: currentMonth,
          kmStart: 100000,
          kmEnd: 101000,
        },
      ]),
    );
    const tripSameDiff: Trip = { ...sampleTrip, kmLoaded: 950, kmEmpty: 0 };
    setupMocks([sampleTruck], [tripSameDiff]);
    render(<MileageRegistryPage />);

    await waitFor(() => {
      expect(
        screen.queryByText("mileageRegistry.alert.discrepancy"),
      ).toBeNull();
    });
  });
});

// ─── Export Excel ──────────────────────────────────────────
describe("MileageRegistryPage — export", () => {
  it("click export apeleaza XLSX.writeFile", async () => {
    const XLSX = await import("xlsx");
    setupMocks([sampleTruck]);
    render(<MileageRegistryPage />);

    fireEvent.click(screen.getByText("mileageRegistry.actions.export"));

    await waitFor(() => {
      expect(XLSX.writeFile).toHaveBeenCalled();
    });
  });

  it("export construieste sheet cu datele corecte", async () => {
    const XLSX = await import("xlsx");
    setupMocks([sampleTruck]);
    render(<MileageRegistryPage />);

    fireEvent.click(screen.getByText("mileageRegistry.actions.export"));

    await waitFor(() => {
      expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalled();
      expect(XLSX.utils.book_append_sheet).toHaveBeenCalled();
    });
  });
});

// ─── Search / Filter ───────────────────────────────────────
describe("MileageRegistryPage — search filter", () => {
  it("filtreaza tabelul dupa input search", async () => {
    setupMocks([sampleTruck, sampleTruck2]);
    render(<MileageRegistryPage />);

    await waitFor(() => {
      expect(screen.getByText("B-123-ABC")).toBeTruthy();
      expect(screen.getByText("CJ-456-DEF")).toBeTruthy();
    });

    const searchInput = screen.getByPlaceholderText(
      "mileageRegistry.placeholders.search",
    );
    fireEvent.change(searchInput, { target: { value: "B-123" } });

    await waitFor(() => {
      expect(screen.getByText("B-123-ABC")).toBeTruthy();
      expect(screen.queryByText("CJ-456-DEF")).toBeNull();
    });
  });
});

// ─── Mobile view ───────────────────────────────────────────
describe("MileageRegistryPage — mobile view", () => {
  it("afiseaza MileageMobileCard pe mobile", async () => {
    setMobile();
    setupMocks([sampleTruck]);
    render(<MileageRegistryPage />);

    await waitFor(() => {
      expect(screen.getByTestId("mobile-card-B-123-ABC")).toBeTruthy();
    });
  });

  it("click edit pe mobile card deschide dialogul", async () => {
    setMobile();
    setupMocks([sampleTruck]);
    render(<MileageRegistryPage />);

    await waitFor(() => screen.getByTestId("mobile-card-B-123-ABC"));
    fireEvent.click(screen.getByText("mileageRegistry.actions.update"));

    await waitFor(() => {
      expect(
        screen.getByText("mileageRegistry.dialog.title — B-123-ABC"),
      ).toBeTruthy();
    });
  });

  it("afiseaza mesaj noResults pe mobile fara date", async () => {
    setMobile();
    setupMocks([]);
    render(<MileageRegistryPage />);

    await waitFor(() => {
      expect(screen.getByText("mileageRegistry.noResults")).toBeTruthy();
    });
  });
});
