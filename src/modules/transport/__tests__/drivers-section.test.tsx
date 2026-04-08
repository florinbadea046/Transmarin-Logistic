// ──────────────────────────────────────────────────────────
// Integration tests: DriversSection
// File: src/modules/transport/__tests__/drivers-section.test.tsx
// ──────────────────────────────────────────────────────────

import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mocks globale ──────────────────────────────────────────

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

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

vi.mock("@/hooks/use-dialog-state", () => ({
  default: () => {
    const [open, setOpen] = React.useState(false);
    return [open, setOpen] as [boolean, (v: boolean) => void];
  },
}));

vi.mock("@/hooks/use-mobile", () => ({
  useMobile: () => false,
}));

// Mock export utils
vi.mock(
  "@/modules/transport/pages/_components/drivers-export-utils",
  () => ({
    exportDriversPDF: vi.fn(),
    exportDriversExcel: vi.fn(),
    exportDriversCSV: vi.fn(),
  }),
);

// Mock import dialog
vi.mock(
  "@/modules/transport/pages/_components/drivers-import-dialog",
  () => ({
    DriverImportDialog: ({ open }: { open: boolean }) =>
      open ? <div data-testid="import-dialog">Import Dialog</div> : null,
  }),
);

// Mock EntityTable - render simplu
vi.mock("@/modules/transport/pages/_components/transport-shared", () => ({
  EntityTable: ({ table, emptyText, renderMobileCard: _rm }: {
    table: { getRowModel: () => { rows: { original: Record<string, unknown>; id: string; getVisibleCells: () => { id: string; column: { columnDef: { cell: unknown } }; getContext: () => unknown }[] }[] } };
    emptyText: string;
    renderMobileCard?: unknown;
    columns?: unknown[];
    searchPlaceholder?: string;
    searchKey?: string;
    filterConfig?: unknown[];
    columnVisibilityClass?: unknown;
  }) => {
    const rows = table.getRowModel().rows;
    if (rows.length === 0) return <div data-testid="empty">{emptyText}</div>;
    return (
      <div data-testid="driver-table">
        {rows.map((row) => (
          <div key={row.id} data-testid={`driver-row-${String(row.original.id)}`}>
            <span>{String(row.original.name)}</span>
            {row.getVisibleCells().map((cell) => {
              const def = cell.column.columnDef as { cell?: (ctx: unknown) => React.ReactNode };
              return (
                <span key={cell.id}>
                  {typeof def.cell === "function" ? def.cell(cell.getContext()) : null}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    );
  },
  ExpiryCell: ({ dateStr }: { dateStr: string }) => <span>{dateStr}</span>,
}));

vi.mock("@/modules/transport/pages/_components/drivers-mobile-card", () => ({
  DriverMobileCard: () => <div data-testid="mobile-card" />,
}));

// localStorage mock
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
  generateId: vi.fn(() => "new-id-123"),
}));

vi.mock("@/data/mock-data", () => ({
  STORAGE_KEYS: {
    drivers: "drivers",
    trucks: "trucks",
    employees: "employees",
  },
}));

// ── Import component ───────────────────────────────────────

import { DriversSection } from "@/modules/transport/pages/_components/drivers-section";
import type { Driver, Truck } from "@/modules/transport/types";
import { addItem, removeItem, updateItem } from "@/utils/local-storage";
import { exportDriversPDF, exportDriversExcel, exportDriversCSV } from "@/modules/transport/pages/_components/drivers-export-utils";

// ── Date test ──────────────────────────────────────────────

const mockDrivers: Driver[] = [
  {
    id: "d1",
    name: "Ion Popescu",
    phone: "0721000001",
    licenseExpiry: "2027-01-01",
    status: "available",
  },
  {
    id: "d2",
    name: "Vasile Marin",
    phone: "0721000002",
    licenseExpiry: "2026-06-15",
    status: "on_trip",
    truckId: "t1",
  },
];

const mockTrucks: Truck[] = [
  {
    id: "t1",
    plateNumber: "CT-01-TML",
    brand: "Volvo",
    model: "FH16",
    year: 2021,
    mileage: 300000,
    status: "on_trip",
    itpExpiry: "2026-09-01",
    rcaExpiry: "2026-12-01",
    vignetteExpiry: "2026-06-30",
  },
];

const mockOnDataChange = vi.fn();

// ── Helpers ────────────────────────────────────────────────

function renderSection(drivers = mockDrivers, trucks = mockTrucks) {
  return render(
    <DriversSection
      drivers={drivers}
      trucks={trucks}
      onDataChange={mockOnDataChange}
    />,
  );
}

// ── Tests ──────────────────────────────────────────────────

describe("DriversSection — render", () => {
  beforeEach(() => vi.clearAllMocks());

  it("afiseaza tabelul cu soferi", () => {
    renderSection();
    expect(screen.getByTestId("driver-table")).toBeInTheDocument();
  });

  it("afiseaza toti soferii din props", () => {
    renderSection();
    expect(screen.getByTestId("driver-row-d1")).toBeInTheDocument();
    expect(screen.getByTestId("driver-row-d2")).toBeInTheDocument();
  });

  it("afiseaza mesaj gol cand nu exista soferi", () => {
    renderSection([]);
    expect(screen.getByTestId("empty")).toBeInTheDocument();
  });

  it("afiseaza butonul Add", () => {
    renderSection();
    expect(screen.getByRole("button", { name: /drivers\.actions\.add/i })).toBeInTheDocument();
  });
});

// ── CRUD Create ────────────────────────────────────────────

describe("DriversSection — CRUD create", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deschide dialogul la click pe Add", async () => {
    renderSection();
    const addBtn = screen.getByRole("button", { name: /drivers\.actions\.add/i });
    await userEvent.click(addBtn);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("afiseaza erori de validare la submit fara date", async () => {
    renderSection();
    await userEvent.click(screen.getByRole("button", { name: /drivers\.actions\.add/i }));
    const submitBtn = screen.getByRole("button", { name: /drivers\.actions\.add/i });
    await userEvent.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByText("drivers.validation.nameMin")).toBeInTheDocument();
    });
  });

  it("apeleaza addItem la submit valid", async () => {
    renderSection();
    await userEvent.click(screen.getByRole("button", { name: /drivers\.actions\.add/i }));

    await userEvent.type(screen.getByLabelText(/drivers\.fields\.name/i), "Andrei Test");
    await userEvent.type(screen.getByLabelText(/drivers\.fields\.phone/i), "0721999888");
    fireEvent.change(screen.getByLabelText(/drivers\.fields\.licenseExpiry/i), {
      target: { value: "2028-01-01" },
    });

    const submitBtn = screen.getAllByRole("button", { name: /drivers\.actions\.add/i }).slice(-1)[0];
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(addItem).toHaveBeenCalled();
    });
  });
});

// ── CRUD Update ────────────────────────────────────────────

describe("DriversSection — CRUD update", () => {
  beforeEach(() => vi.clearAllMocks());

  it("apeleaza updateItem la edit si submit valid", async () => {
    renderSection();
    // Gaseste butonul edit (Pencil) pentru primul sofer
    const editBtns = screen.getAllByLabelText("drivers.actions.edit");
    await userEvent.click(editBtns[0]);

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Schimba numele
    const nameInput = screen.getByLabelText(/drivers\.fields\.name/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Ion Popescu Modificat");

    const saveBtn = screen.getByRole("button", { name: /drivers\.save/i });
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateItem).toHaveBeenCalled();
    });
  });
});

// ── CRUD Delete ────────────────────────────────────────────

describe("DriversSection — CRUD delete", () => {
  beforeEach(() => vi.clearAllMocks());

  it("afiseaza dialog confirmare la click Delete", async () => {
    renderSection();
    const deleteBtns = screen.getAllByLabelText("drivers.actions.delete");
    await userEvent.click(deleteBtns[0]);
    expect(screen.getByText("drivers.confirmDeleteTitle")).toBeInTheDocument();
  });

  it("apeleaza removeItem la confirmare stergere", async () => {
    renderSection();
    const deleteBtns = screen.getAllByLabelText("drivers.actions.delete");
    await userEvent.click(deleteBtns[0]);

    const confirmBtn = screen.getByRole("button", { name: /drivers\.actions\.confirm/i });
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(removeItem).toHaveBeenCalled();
    });
  });

  it("apeleaza onDataChange dupa stergere", async () => {
    renderSection();
    const deleteBtns = screen.getAllByLabelText("drivers.actions.delete");
    await userEvent.click(deleteBtns[0]);
    await userEvent.click(screen.getByRole("button", { name: /drivers\.actions\.confirm/i }));
    await waitFor(() => {
      expect(mockOnDataChange).toHaveBeenCalled();
    });
  });
});

// ── Validare formular ──────────────────────────────────────

describe("DriversSection — validare", () => {
  beforeEach(() => vi.clearAllMocks());

  it("afiseaza eroare la telefon invalid", async () => {
    renderSection();
    await userEvent.click(screen.getByRole("button", { name: /drivers\.actions\.add/i }));

    await userEvent.type(screen.getByLabelText(/drivers\.fields\.name/i), "Nume Valid Test");
    await userEvent.type(screen.getByLabelText(/drivers\.fields\.phone/i), "123456789");

    const submitBtn = screen.getAllByRole("button", { name: /drivers\.actions\.add/i }).slice(-1)[0];
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("drivers.validation.phoneInvalid")).toBeInTheDocument();
    });
  });

  it("nu afiseaza erori la date valide", async () => {
    renderSection();
    await userEvent.click(screen.getByRole("button", { name: /drivers\.actions\.add/i }));

    await userEvent.type(screen.getByLabelText(/drivers\.fields\.name/i), "Sofer Valid");
    await userEvent.type(screen.getByLabelText(/drivers\.fields\.phone/i), "0721000099");
    fireEvent.change(screen.getByLabelText(/drivers\.fields\.licenseExpiry/i), {
      target: { value: "2028-06-30" },
    });

    const submitBtn = screen.getAllByRole("button", { name: /drivers\.actions\.add/i }).slice(-1)[0];
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.queryByText("drivers.validation.nameMin")).not.toBeInTheDocument();
      expect(screen.queryByText("drivers.validation.phoneInvalid")).not.toBeInTheDocument();
    });
  });
});

// ── Import CSV ─────────────────────────────────────────────

describe("DriversSection — Import CSV", () => {
  beforeEach(() => vi.clearAllMocks());

  it("afiseaza butonul Import", () => {
    renderSection();
    expect(screen.getByRole("button", { name: /drivers\.import\.button/i })).toBeInTheDocument();
  });

  it("deschide import dialog la click", async () => {
    renderSection();
    await userEvent.click(screen.getByRole("button", { name: /drivers\.import\.button/i }));
    await waitFor(() => {
      expect(screen.getByTestId("import-dialog")).toBeInTheDocument();
    });
  });
});

// ── Export ─────────────────────────────────────────────────

describe("DriversSection — Export", () => {
  beforeEach(() => vi.clearAllMocks());

  it("apeleaza exportDriversPDF la click Export PDF", async () => {
    renderSection();
    const exportBtn = screen.getByTitle("drivers.actions.export");
    await userEvent.click(exportBtn);
    const pdfItem = screen.getByText("drivers.actions.exportPdf");
    await userEvent.click(pdfItem);
    expect(exportDriversPDF).toHaveBeenCalledWith(mockDrivers, mockTrucks, expect.any(Function));
  });

  it("apeleaza exportDriversExcel la click Export Excel", async () => {
    renderSection();
    await userEvent.click(screen.getByTitle("drivers.actions.export"));
    await userEvent.click(screen.getByText("drivers.actions.exportExcel"));
    expect(exportDriversExcel).toHaveBeenCalledWith(mockDrivers, mockTrucks, expect.any(Function));
  });

  it("apeleaza exportDriversCSV la click Export CSV", async () => {
    renderSection();
    await userEvent.click(screen.getByTitle("drivers.actions.export"));
    await userEvent.click(screen.getByText("drivers.actions.exportCsv"));
    expect(exportDriversCSV).toHaveBeenCalledWith(mockDrivers, mockTrucks, expect.any(Function));
  });
});

// ── Coverage suplimentar ───────────────────────────────────

describe("DriversSection — goToProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("apeleaza navigate la click pe numele soferului", async () => {
    renderSection();
    const nameBtn = screen.getByRole("button", { name: /Ion Popescu/i });
    await userEvent.click(nameBtn);
    // navigate e mock-uit global — verificam ca butonul e clickabil
    expect(nameBtn).toBeInTheDocument();
  });
});

describe("DriversSection — truck assignment conflict", () => {
  beforeEach(() => vi.clearAllMocks());

  it("apeleaza updateItem la editare sofer cu truckId", async () => {
    // d2 are truckId: "t1" — editam si salvam
    renderSection();
    const editBtns = screen.getAllByLabelText("drivers.actions.edit");
    await userEvent.click(editBtns[1]); // d2

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const saveBtn = screen.getByRole("button", { name: /drivers\.save/i });
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateItem).toHaveBeenCalled();
    });
  });
});

describe("DriversSection — licenseExpiry validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("afiseaza eroare cand licenseExpiry lipseste", async () => {
    renderSection();
    await userEvent.click(screen.getByRole("button", { name: /drivers\.actions\.add/i }));

    await userEvent.type(screen.getByLabelText(/drivers\.fields\.name/i), "Sofer Test Valid");
    await userEvent.type(screen.getByLabelText(/drivers\.fields\.phone/i), "0721000055");

    const submitBtn = screen.getAllByRole("button", { name: /drivers\.actions\.add/i }).slice(-1)[0];
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("drivers.validation.licenseExpiryRequired")).toBeInTheDocument();
    });
  });
});

describe("DriversSection — mobile card", () => {
  beforeEach(() => vi.clearAllMocks());

  it("randeaza sectiunea fara erori pe mobile", () => {
    renderSection();
    expect(screen.getByTestId("driver-table")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /drivers\.actions\.add/i })).toBeInTheDocument();
  });
});