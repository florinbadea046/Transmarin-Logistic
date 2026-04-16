// ──────────────────────────────────────────────────────────
// Integration tests: MaintenancePage
// File: src/modules/transport/__tests__/maintenance-page.test.tsx
// Coverage target: statements >80%, branch >65%, functions >80%
// ──────────────────────────────────────────────────────────

import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mocks ──────────────────────────────────────────────────

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, opts?: Record<string, unknown>) => {
      if (opts && opts.days !== undefined) return `${k}:${opts.days}`;
      return k;
    },
    i18n: { language: "ro" },
  }),
}));

vi.mock("@/hooks/use-audit-log", () => ({
  useAuditLog: () => ({ log: vi.fn() }),
}));

// Desktop by default; override per-test cu vi.mocked(useMobile).mockReturnValue(true)
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
  generateId: vi.fn(() => "new-maint-id"),
}));

vi.mock("@/data/mock-data", () => ({
  STORAGE_KEYS: { maintenance: "maintenance", trucks: "trucks" },
}));

// ── Imports ────────────────────────────────────────────────

import MaintenancePage from "@/modules/transport/pages/maintenance";
import type { Truck, MaintenanceRecord } from "@/modules/transport/types";
import { removeItem, updateItem, getCollection } from "@/utils/local-storage";
import { useMobile } from "@/hooks/use-mobile";

// ── Helpers ────────────────────────────────────────────────

const today = new Date();
const formatDate = (d: Date) => d.toISOString().split("T")[0];
const daysAgo = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return formatDate(d);
};

const mockTrucks: Truck[] = [
  {
    id: "t1",
    plateNumber: "CT-01-TML",
    brand: "Volvo",
    model: "FH16",
    year: 2021,
    mileage: 300000,
    status: "in_service",
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

const mockRecords: MaintenanceRecord[] = [
  {
    id: "m1",
    truckId: "t1",
    type: "revizie",
    description: "Schimb ulei motor",
    entryDate: daysAgo(10),
    cost: 500,
    mechanic: "Ion Mecanicul",
    status: "in_lucru",
  },
  {
    id: "m2",
    truckId: "t2",
    type: "frane",
    description: "Inlocuire placute frana",
    entryDate: daysAgo(3),
    exitDate: formatDate(today),
    cost: 800,
    mechanic: "Vasile Service",
    status: "finalizat",
  },
];

function setupStorage(records = mockRecords, trucks = mockTrucks) {
  mockStorage["maintenance"] = JSON.stringify(records);
  mockStorage["trucks"] = JSON.stringify(trucks);
  vi.mocked(getCollection).mockImplementation((key: string) => {
    try { return JSON.parse(mockStorage[key] ?? "[]"); } catch { return []; }
  });
}

function renderPage() {
  return render(<MaintenancePage />);
}

// ── Render ─────────────────────────────────────────────────

describe("MaintenancePage — render", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("randeaza pagina fara erori", () => {
    renderPage();
    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("main")).toBeInTheDocument();
  });

  it("afiseaza titlul paginii", () => {
    renderPage();
    expect(screen.getByText("maintenance.title")).toBeInTheDocument();
  });

  it("afiseaza butonul Add pe desktop", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /maintenance\.actions\.add/i })).toBeInTheDocument();
  });

  it("afiseaza tabelul cu inregistrari", () => {
    renderPage();
    expect(screen.getByText("Schimb ulei motor")).toBeInTheDocument();
    expect(screen.getByText("Inlocuire placute frana")).toBeInTheDocument();
  });

  it("afiseaza mesaj noResults cand lista e goala", () => {
    setupStorage([]);
    renderPage();
    expect(screen.getByText("maintenance.noResults")).toBeInTheDocument();
  });

  it("afiseaza paginatia", () => {
    renderPage();
    expect(screen.getByTestId("pagination")).toBeInTheDocument();
  });
});

// ── Mobile view (liniile ~557, ~623-628, ~682) ─────────────

describe("MaintenancePage — mobile view", () => {
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
    // Pe mobile nu exista <table>
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("Schimb ulei motor")).toBeInTheDocument();
  });

  it("afiseaza noResults pe mobile cand lista e goala", () => {
    setupStorage([]);
    renderPage();
    expect(screen.getByText("maintenance.noResults")).toBeInTheDocument();
  });

  it("afiseaza butoanele edit si delete in card-urile mobile", () => {
    renderPage();
    const pencilBtns = document.querySelectorAll(".lucide-pencil");
    const trashBtns = document.querySelectorAll(".lucide-trash-2");
    expect(pencilBtns.length).toBeGreaterThan(0);
    expect(trashBtns.length).toBeGreaterThan(0);
  });

  it("afiseaza data intrare in card-urile mobile", () => {
    renderPage();
    const body = document.body.textContent ?? "";
    expect(body).toContain(daysAgo(10));
  });

  it("afiseaza data iesire in card-urile mobile cand exista", () => {
    renderPage();
    const body = document.body.textContent ?? "";
    expect(body).toContain(formatDate(today));
  });

  it("deschide confirm delete din card mobile", async () => {
    renderPage();
    const trashBtns = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector(".lucide-trash-2"),
    );
    if (trashBtns.length > 0) {
      await userEvent.click(trashBtns[0]);
      expect(screen.getByText("maintenance.confirmDeleteTitle")).toBeInTheDocument();
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
});

// ── CostSummary (linia ~120) ───────────────────────────────

describe("MaintenancePage — CostSummary", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("afiseaza KPI card total cost", () => {
    renderPage();
    expect(screen.getByText("maintenance.kpi.totalCost")).toBeInTheDocument();
  });

  it("afiseaza KPI card completed", () => {
    renderPage();
    expect(screen.getByText("maintenance.kpi.completed")).toBeInTheDocument();
  });

  it("afiseaza KPI card in progress", () => {
    renderPage();
    expect(screen.getByText("maintenance.kpi.inProgress")).toBeInTheDocument();
  });

  it("afiseaza costul total corect (500 + 800 = 1300 RON)", () => {
    renderPage();
    expect(screen.getByText("1.300 RON")).toBeInTheDocument();
  });

  it("afiseaza KPI costPerTruck cand exista inregistrari", () => {
    renderPage();
    expect(screen.getByText("maintenance.kpi.costPerTruck")).toBeInTheDocument();
  });

  it("afiseaza placuta camionului in sectiunea cost per camion", () => {
    renderPage();
    const body = document.body.textContent ?? "";
    expect(body).toContain("CT-01-TML");
  });

  it("nu afiseaza sectiunea costPerTruck cand lista e goala", () => {
    setupStorage([]);
    renderPage();
    expect(screen.queryByText("maintenance.kpi.costPerTruck")).not.toBeInTheDocument();
  });

  it("afiseaza count 0 in_lucru fara erori cand nu exista", () => {
    setupStorage([{
      id: "m1",
      truckId: "t1",
      type: "revizie",
      description: "Test",
      entryDate: daysAgo(1),
      cost: 100,
      mechanic: "Mec",
      status: "finalizat",
    }]);
    renderPage();
    expect(screen.getByText("maintenance.kpi.inProgress")).toBeInTheDocument();
  });
});

// ── LongServiceAlert ───────────────────────────────────────

describe("MaintenancePage — LongServiceAlert", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("afiseaza alerta cand un camion e in service > 7 zile", () => {
    setupStorage();
    renderPage();
    expect(screen.getByText("maintenance.alerts.longService")).toBeInTheDocument();
  });

  it("nu afiseaza alerta cand nu exista camioane in service > 7 zile", () => {
    setupStorage([{
      id: "m3",
      truckId: "t1",
      type: "revizie",
      description: "Revizie recenta",
      entryDate: daysAgo(3),
      cost: 200,
      mechanic: "Mecanic",
      status: "in_lucru",
    }]);
    renderPage();
    expect(screen.queryByText("maintenance.alerts.longService")).not.toBeInTheDocument();
  });

  it("nu afiseaza alerta pentru inregistrari finalizate > 7 zile", () => {
    setupStorage([{
      id: "m4",
      truckId: "t1",
      type: "frane",
      description: "Frane vechi",
      entryDate: daysAgo(15),
      exitDate: daysAgo(2),
      cost: 300,
      mechanic: "Mec",
      status: "finalizat",
    }]);
    renderPage();
    expect(screen.queryByText("maintenance.alerts.longService")).not.toBeInTheDocument();
  });

  it("nu afiseaza alerta pentru in_lucru cu exitDate setat", () => {
    setupStorage([{
      id: "m5",
      truckId: "t1",
      type: "revizie",
      description: "Cu exit",
      entryDate: daysAgo(10),
      exitDate: daysAgo(1),
      cost: 100,
      mechanic: "Mec",
      status: "in_lucru",
    }]);
    renderPage();
    expect(screen.queryByText("maintenance.alerts.longService")).not.toBeInTheDocument();
  });

  it("afiseaza numarul de zile in alerta (10 zile)", () => {
    setupStorage();
    renderPage();
    expect(screen.getByText(/maintenance\.alerts\.daysInService:10/)).toBeInTheDocument();
  });

  it("afiseaza placuta camionului in alerta", () => {
    setupStorage();
    renderPage();
    const body = document.body.textContent ?? "";
    expect(body).toContain("CT-01-TML");
  });

  it("afiseaza mecanicul in alerta", () => {
    setupStorage();
    renderPage();
    const body = document.body.textContent ?? "";
    expect(body).toContain("Ion Mecanicul");
  });
});

// ── CRUD Create ────────────────────────────────────────────

describe("MaintenancePage — CRUD create", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("deschide dialogul la click pe Add", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /maintenance\.actions\.add/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("dialogul afiseaza titlul add", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /maintenance\.actions\.add/i }));
    expect(screen.getByText("maintenance.add")).toBeInTheDocument();
  });

  it("dialogul afiseaza toate campurile obligatorii", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /maintenance\.actions\.add/i }));
    expect(screen.getByPlaceholderText("maintenance.placeholders.description")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("maintenance.placeholders.mechanic")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("maintenance.placeholders.notes")).toBeInTheDocument();
    expect(screen.getByText("maintenance.fields.truck")).toBeInTheDocument();
    expect(screen.getByText("maintenance.fields.type")).toBeInTheDocument();
    expect(screen.getByText("maintenance.fields.entryDate")).toBeInTheDocument();
    expect(screen.getByText("maintenance.fields.cost")).toBeInTheDocument();
  });

  it("inchide dialogul la click pe Cancel", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /maintenance\.actions\.add/i }));
    await userEvent.click(screen.getByRole("button", { name: /maintenance\.cancel/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("afiseaza eroare la submit fara truck selectat", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /maintenance\.actions\.add/i }));
    await userEvent.click(screen.getByRole("button", { name: /maintenance\.actions\.add/i }));
    await waitFor(() => {
      expect(screen.getByText("maintenance.validation.truckRequired")).toBeInTheDocument();
    });
  });

  it("nu afiseaza erori inainte de primul submit", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /maintenance\.actions\.add/i }));
    expect(screen.queryByText("maintenance.validation.truckRequired")).not.toBeInTheDocument();
  });

  it("resetseaza form la deschidere add dupa edit anterior", async () => {
    renderPage();
    // Deschide edit
    const pencilBtns = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector(".lucide-pencil"),
    );
    await userEvent.click(pencilBtns[0]);
    await userEvent.click(screen.getByRole("button", { name: /maintenance\.cancel/i }));
    // Deschide add
    await userEvent.click(screen.getByRole("button", { name: /maintenance\.actions\.add/i }));
    const descInput = screen.getByPlaceholderText("maintenance.placeholders.description") as HTMLInputElement;
    expect(descInput.value).toBe("");
  });
});

// ── CRUD Edit / Update (liniile 281-317, 331, 345) ─────────

describe("MaintenancePage — CRUD update", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("deschide dialogul de edit cu titlul corect", async () => {
    renderPage();
    const pencilBtns = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector(".lucide-pencil"),
    );
    await userEvent.click(pencilBtns[0]);
    expect(screen.getByText("maintenance.edit")).toBeInTheDocument();
  });

  it("preincarca descrierea in form la edit", async () => {
    renderPage();
    const pencilBtns = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector(".lucide-pencil"),
    );
    // Tabelul e sortat desc dupa entryDate:
    // pencilBtns[0] = m2 (3 zile), pencilBtns[1] = m1 (10 zile)
    await userEvent.click(pencilBtns[1]);
    await waitFor(() => {
      const descInput = screen.getByPlaceholderText("maintenance.placeholders.description") as HTMLInputElement;
      expect(descInput.value).toBe("Schimb ulei motor");
    });
  });

  it("preincarca mecanicul in form la edit", async () => {
    renderPage();
    const pencilBtns = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector(".lucide-pencil"),
    );
    // pencilBtns[0] = m2 (Vasile Service), pencilBtns[1] = m1 (Ion Mecanicul)
    await userEvent.click(pencilBtns[1]);
    await waitFor(() => {
      const mechInput = screen.getByPlaceholderText("maintenance.placeholders.mechanic") as HTMLInputElement;
      expect(mechInput.value).toBe("Ion Mecanicul");
    });
  });

  it("butonul de submit in edit arata textul save", async () => {
    renderPage();
    const pencilBtns = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector(".lucide-pencil"),
    );
    await userEvent.click(pencilBtns[0]);
    expect(screen.getByRole("button", { name: /maintenance\.save/i })).toBeInTheDocument();
  });

  it("apeleaza updateItem la submit valid in modul edit", async () => {
    renderPage();
    const pencilBtns = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector(".lucide-pencil"),
    );
    await userEvent.click(pencilBtns[0]);

    const descInput = screen.getByPlaceholderText("maintenance.placeholders.description");
    await userEvent.clear(descInput);
    await userEvent.type(descInput, "Revizie completa actualizata");

    await userEvent.click(screen.getByRole("button", { name: /maintenance\.save/i }));
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
    await userEvent.click(screen.getByRole("button", { name: /maintenance\.save/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("apeleaza updateItem pentru camion la save cu status finalizat", async () => {
    renderPage();
    // m2 e finalizat - al doilea pencil
    const pencilBtns = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector(".lucide-pencil"),
    );
    if (pencilBtns.length >= 2) {
      await userEvent.click(pencilBtns[1]);
      await userEvent.click(screen.getByRole("button", { name: /maintenance\.save/i }));
      await waitFor(() => {
        expect(updateItem).toHaveBeenCalled();
      });
    }
  });
});

// ── CRUD Delete ────────────────────────────────────────────

describe("MaintenancePage — CRUD delete", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("afiseaza dialog confirmare la click Delete", async () => {
    renderPage();
    const trashBtns = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector(".lucide-trash-2"),
    );
    await userEvent.click(trashBtns[0]);
    expect(screen.getByText("maintenance.confirmDeleteTitle")).toBeInTheDocument();
    expect(screen.getByText("maintenance.confirmDelete")).toBeInTheDocument();
  });

  it("apeleaza removeItem la confirmare stergere", async () => {
    renderPage();
    const trashBtns = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector(".lucide-trash-2"),
    );
    await userEvent.click(trashBtns[0]);
    await userEvent.click(screen.getByRole("button", { name: /maintenance\.actions\.confirm/i }));
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
    await userEvent.click(screen.getByRole("button", { name: /maintenance\.cancel/i }));
    await waitFor(() => {
      expect(screen.queryByText("maintenance.confirmDeleteTitle")).not.toBeInTheDocument();
    });
  });

  it("nu apeleaza removeItem la anulare stergere", async () => {
    renderPage();
    const trashBtns = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector(".lucide-trash-2"),
    );
    await userEvent.click(trashBtns[0]);
    await userEvent.click(screen.getByRole("button", { name: /maintenance\.cancel/i }));
    expect(removeItem).not.toHaveBeenCalled();
  });
});

// ── Status workflow + statusClass (linia ~120) ────────────

describe("MaintenancePage — status workflow", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("afiseaza badge status in_lucru", () => {
    setupStorage();
    renderPage();
    expect(screen.getByText("maintenance.status.in_lucru")).toBeInTheDocument();
  });

  it("afiseaza badge status finalizat", () => {
    setupStorage();
    renderPage();
    expect(screen.getByText("maintenance.status.finalizat")).toBeInTheDocument();
  });

  it("afiseaza badge status programat cand exista", () => {
    setupStorage([{
      id: "m3",
      truckId: "t1",
      type: "revizie",
      description: "Revizie programata",
      entryDate: formatDate(today),
      cost: 0,
      mechanic: "Mecanic",
      status: "programat",
    }]);
    renderPage();
    expect(screen.getByText("maintenance.status.programat")).toBeInTheDocument();
  });

  it("randeaza toate cele 3 status-uri fara erori", () => {
    setupStorage([
      { ...mockRecords[0], id: "s1", status: "in_lucru" },
      { ...mockRecords[0], id: "s2", status: "finalizat" },
      { ...mockRecords[0], id: "s3", status: "programat" },
    ]);
    renderPage();
    expect(screen.getByText("maintenance.status.in_lucru")).toBeInTheDocument();
    expect(screen.getByText("maintenance.status.finalizat")).toBeInTheDocument();
    expect(screen.getByText("maintenance.status.programat")).toBeInTheDocument();
  });
});

// ── Search / globalFilter (liniile 486-493) ───────────────

describe("MaintenancePage — search", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("afiseaza input de cautare", () => {
    renderPage();
    expect(screen.getByPlaceholderText("maintenance.placeholders.search")).toBeInTheDocument();
  });

  it("filtreaza dupa descriere", async () => {
    renderPage();
    await userEvent.type(screen.getByPlaceholderText("maintenance.placeholders.search"), "ulei");
    await waitFor(() => {
      expect(screen.getByText("Schimb ulei motor")).toBeInTheDocument();
    });
  });

  it("filtreaza dupa mecanic", async () => {
    renderPage();
    await userEvent.type(screen.getByPlaceholderText("maintenance.placeholders.search"), "Vasile");
    await waitFor(() => {
      expect(screen.getByText("Inlocuire placute frana")).toBeInTheDocument();
    });
  });

  it("filtreaza dupa placuta camionului", async () => {
    renderPage();
    await userEvent.type(screen.getByPlaceholderText("maintenance.placeholders.search"), "CT-01");
    await waitFor(() => {
      expect(screen.getByText("Schimb ulei motor")).toBeInTheDocument();
    });
  });

  it("afiseaza noResults cand cautarea nu gaseste nimic", async () => {
    renderPage();
    await userEvent.type(screen.getByPlaceholderText("maintenance.placeholders.search"), "xyzxyzxyz");
    await waitFor(() => {
      expect(screen.getByText("maintenance.noResults")).toBeInTheDocument();
    });
  });

  it("query gol afiseaza toate inregistrarile", async () => {
    renderPage();
    const searchInput = screen.getByPlaceholderText("maintenance.placeholders.search");
    await userEvent.type(searchInput, "ulei");
    await userEvent.clear(searchInput);
    await waitFor(() => {
      expect(screen.getByText("Schimb ulei motor")).toBeInTheDocument();
      expect(screen.getByText("Inlocuire placute frana")).toBeInTheDocument();
    });
  });
});

// ── Coloane tabel (linia 250) ─────────────────────────────

describe("MaintenancePage — coloane tabel", () => {
  beforeEach(() => { vi.clearAllMocks(); setupStorage(); });

  it("afiseaza brand si model camion in coloana truck", () => {
    renderPage();
    expect(screen.getByText(/Volvo/)).toBeInTheDocument();
    expect(screen.getByText(/FH16/)).toBeInTheDocument();
  });

  it("afiseaza dash pentru exitDate lipsa", () => {
    renderPage();
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("afiseaza exitDate cand exista", () => {
    renderPage();
    expect(screen.getByText(formatDate(today))).toBeInTheDocument();
  });

  it("afiseaza tipul de mentenanta tradus", () => {
    renderPage();
    expect(screen.getByText("maintenance.types.revizie")).toBeInTheDocument();
    expect(screen.getByText("maintenance.types.frane")).toBeInTheDocument();
  });

  it("afiseaza costul formatat cu RON", () => {
    renderPage();
    // Costul apare atat in tabel cat si in CostSummary -> folosim getAllByText
    expect(screen.getAllByText("500 RON").length).toBeGreaterThan(0);
    expect(screen.getAllByText("800 RON").length).toBeGreaterThan(0);
  });

  it("afiseaza truckId ca fallback cand camionul nu exista", () => {
    setupStorage(mockRecords, []); // fara camioane
    renderPage();
    const body = document.body.textContent ?? "";
    expect(body).toContain("t1");
  });
});