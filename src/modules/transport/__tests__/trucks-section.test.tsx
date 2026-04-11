// ──────────────────────────────────────────────────────────
// Integration tests: TrucksSection
// File: src/modules/transport/__tests__/trucks-section.test.tsx
// ──────────────────────────────────────────────────────────

import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mocks globale ──────────────────────────────────────────

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, _opts?: unknown) => k,
    i18n: { language: "ro" },
  }),
}));

vi.mock("@/hooks/use-audit-log", () => ({
  useAuditLog: () => ({ log: vi.fn() }),
}));

vi.mock("@/hooks/use-dialog-state", () => ({
  default: function useDialogStateMock() {
    const [open, setOpen] = React.useState(false);
    return [open, setOpen] as [boolean, (v: boolean) => void];
  },
}));

vi.mock("@/hooks/use-mobile", () => ({
  useMobile: () => false,
}));

vi.mock(
  "@/modules/transport/pages/_components/trucks-export-utils",
  () => ({
    exportTrucksPDF: vi.fn(),
    exportTrucksExcel: vi.fn(),
    exportTrucksCSV: vi.fn(),
  }),
);

vi.mock(
  "@/modules/transport/pages/_components/trucks-import-dialog",
  () => ({
    TruckImportDialog: ({ open }: { open: boolean }) =>
      open ? <div data-testid="import-dialog">Import Dialog</div> : null,
  }),
);

vi.mock(
  "@/modules/transport/pages/_components/trucks-form-dialog",
  () => ({
    TruckDialog: ({ open, editingTruck, onSubmit, onOpenChange, onFormChange, form, errors }: {
      open: boolean;
      editingTruck: unknown;
      onSubmit: () => void;
      onOpenChange: (v: boolean) => void;
      onFormChange: (patch: Record<string, unknown>) => void;
      form: Record<string, string>;
      errors: Record<string, string>;
    }) => {
      if (!open) return null;
      return (
        <div role="dialog">
          <input aria-label="trucks.fields.plateNumber" value={form.plateNumber ?? ""} onChange={(e) => onFormChange({ plateNumber: e.target.value })} />
          <input aria-label="trucks.fields.brand" value={form.brand ?? ""} onChange={(e) => onFormChange({ brand: e.target.value })} />
          <input aria-label="trucks.fields.model" value={form.model ?? ""} onChange={(e) => onFormChange({ model: e.target.value })} />
          <input aria-label="trucks.fields.year" value={form.year ?? ""} onChange={(e) => onFormChange({ year: e.target.value })} />
          <input aria-label="trucks.fields.mileage" value={form.mileage ?? ""} onChange={(e) => onFormChange({ mileage: e.target.value })} />
          <input aria-label="trucks.fields.itpExpiry" type="date" value={form.itpExpiry ?? ""} onChange={(e) => onFormChange({ itpExpiry: e.target.value })} />
          <input aria-label="trucks.fields.rcaExpiry" type="date" value={form.rcaExpiry ?? ""} onChange={(e) => onFormChange({ rcaExpiry: e.target.value })} />
          <input aria-label="trucks.fields.vignetteExpiry" type="date" value={form.vignetteExpiry ?? ""} onChange={(e) => onFormChange({ vignetteExpiry: e.target.value })} />
          {errors.plateNumber && <p>{errors.plateNumber}</p>}
          {errors.brand && <p>{errors.brand}</p>}
          {errors.year && <p>{errors.year}</p>}
          {errors.mileage && <p>{errors.mileage}</p>}
          {errors.itpExpiry && <p>{errors.itpExpiry}</p>}
          <button onClick={onSubmit}>{editingTruck ? "trucks.save" : "trucks.actions.add"}</button>
          <button onClick={() => onOpenChange(false)}>trucks.actions.cancel</button>
        </div>
      );
    },
  }),
);

vi.mock(
  "@/modules/transport/pages/_components/trucks-assign-dialog",
  () => ({
    AssignDialog: ({ open, onSubmit, onOpenChange, onDriverChange }: {
      open: boolean;
      onSubmit: () => void;
      onOpenChange: (v: boolean) => void;
      onDriverChange: (v: string) => void;
      truck: unknown;
      drivers: unknown[];
      selectedDriverId: string;
    }) => {
      if (!open) return null;
      return (
        <div role="dialog" data-testid="assign-dialog">
          <select aria-label="assign-driver" onChange={(e) => onDriverChange(e.target.value)}>
            <option value="none">none</option>
            <option value="d1">Ion Popescu</option>
          </select>
          <button onClick={onSubmit}>trucks.actions.assignConfirm</button>
          <button onClick={() => onOpenChange(false)}>trucks.actions.cancel</button>
        </div>
      );
    },
  }),
);

vi.mock("@/modules/transport/pages/_components/transport-shared", () => ({
  EntityTable: ({ table, emptyText }: {
    table: { getRowModel: () => { rows: { original: Record<string, unknown>; id: string; getVisibleCells: () => { id: string; column: { columnDef: { cell: unknown } }; getContext: () => unknown }[] }[] } };
    emptyText: string;
  }) => {
    const rows = table.getRowModel().rows;
    if (rows.length === 0) return <div data-testid="empty">{emptyText}</div>;
    return (
      <div data-testid="truck-table">
        {rows.map((row) => (
          <div key={row.id} data-testid={`truck-row-${String(row.original.id)}`}>
            <span>{String(row.original.plateNumber)}</span>
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
  ExpiryCell: ({ dateStr }: { dateStr: string }) => <span data-testid="expiry-cell">{dateStr}</span>,
}));

vi.mock("@/modules/transport/pages/_components/trucks-mobile-card", () => ({
  TruckMobileCard: () => <div data-testid="mobile-card" />,
}));

vi.mock("@/modules/transport/pages/_components/trucks-constants", () => ({
  STATUS_CLASS: {
    available: "bg-green-100",
    on_trip: "bg-yellow-100",
    in_service: "bg-red-100",
  },
}));

const mockStorage: Record<string, string> = {};

vi.mock("@/utils/local-storage", () => ({
  addItem: vi.fn((key: string, item: Record<string, unknown>) => {
    const arr = JSON.parse(mockStorage[key] ?? "[]");
    arr.push(item);
    mockStorage[key] = JSON.stringify(arr);
  }),
  updateItem: vi.fn(),
  removeItem: vi.fn(),
  generateId: vi.fn(() => "new-truck-id"),
}));

vi.mock("@/data/mock-data", () => ({
  STORAGE_KEYS: {
    trucks: "trucks",
    drivers: "drivers",
  },
}));

// ── Import component ───────────────────────────────────────

import { TrucksSection } from "@/modules/transport/pages/_components/trucks-section";
import type { Driver, Truck } from "@/modules/transport/types";
import { addItem, removeItem, updateItem } from "@/utils/local-storage";
import { exportTrucksPDF, exportTrucksExcel, exportTrucksCSV } from "@/modules/transport/pages/_components/trucks-export-utils";

// ── Date test ──────────────────────────────────────────────

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
    status: "on_trip",
    itpExpiry: "2026-07-15",
    rcaExpiry: "2027-01-15",
    vignetteExpiry: "2026-08-31",
  },
];

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
    truckId: "t2",
  },
];

const mockOnDataChange = vi.fn();

function renderSection(trucks = mockTrucks, drivers = mockDrivers) {
  return render(
    <TrucksSection
      trucks={trucks}
      drivers={drivers}
      onDataChange={mockOnDataChange}
    />,
  );
}

// ── Render ─────────────────────────────────────────────────

describe("TrucksSection — render", () => {
  beforeEach(() => vi.clearAllMocks());

  it("afiseaza tabelul cu camioane", () => {
    renderSection();
    expect(screen.getByTestId("truck-table")).toBeInTheDocument();
  });

  it("afiseaza toate camioanele din props", () => {
    renderSection();
    expect(screen.getByTestId("truck-row-t1")).toBeInTheDocument();
    expect(screen.getByTestId("truck-row-t2")).toBeInTheDocument();
  });

  it("afiseaza mesaj gol cand nu exista camioane", () => {
    renderSection([]);
    expect(screen.getByTestId("empty")).toBeInTheDocument();
  });

  it("afiseaza butonul Add", () => {
    renderSection();
    expect(screen.getByRole("button", { name: /trucks\.actions\.add/i })).toBeInTheDocument();
  });

  it("afiseaza ExpiryCell pentru datele de expirare", () => {
    renderSection();
    const expiryCells = screen.getAllByTestId("expiry-cell");
    expect(expiryCells.length).toBeGreaterThan(0);
  });
});

// ── CRUD Create ────────────────────────────────────────────

describe("TrucksSection — CRUD create", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deschide dialogul la click pe Add", async () => {
    renderSection();
    await userEvent.click(screen.getByRole("button", { name: /trucks\.actions\.add/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("afiseaza eroare la plateNumber invalid", async () => {
    renderSection();
    await userEvent.click(screen.getByRole("button", { name: /trucks\.actions\.add/i }));

    await userEvent.type(screen.getByLabelText(/trucks\.fields\.plateNumber/i), "INVALID");
    await userEvent.click(screen.getAllByRole("button", { name: /trucks\.actions\.add/i }).slice(-1)[0]);

    await waitFor(() => {
      expect(screen.getByText("trucks.validation.plateNumberInvalid")).toBeInTheDocument();
    });
  });

  it("apeleaza addItem la submit valid", async () => {
    renderSection();
    await userEvent.click(screen.getByRole("button", { name: /trucks\.actions\.add/i }));

    fireEvent.change(screen.getByLabelText(/trucks\.fields\.plateNumber/i), { target: { value: "CT-03-TML" } });
    fireEvent.change(screen.getByLabelText(/trucks\.fields\.brand/i), { target: { value: "Volvo" } });
    fireEvent.change(screen.getByLabelText(/trucks\.fields\.model/i), { target: { value: "FH16" } });
    fireEvent.change(screen.getByLabelText(/trucks\.fields\.year/i), { target: { value: "2022" } });
    fireEvent.change(screen.getByLabelText(/trucks\.fields\.mileage/i), { target: { value: "50000" } });
    fireEvent.change(screen.getByLabelText(/trucks\.fields\.itpExpiry/i), { target: { value: "2027-01-01" } });
    fireEvent.change(screen.getByLabelText(/trucks\.fields\.rcaExpiry/i), { target: { value: "2027-01-01" } });
    fireEvent.change(screen.getByLabelText(/trucks\.fields\.vignetteExpiry/i), { target: { value: "2027-01-01" } });

    await userEvent.click(screen.getAllByRole("button", { name: /trucks\.actions\.add/i }).slice(-1)[0]);

    await waitFor(() => {
      expect(addItem).toHaveBeenCalled();
    });
  });
});

// ── CRUD Update ────────────────────────────────────────────

describe("TrucksSection — CRUD update", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deschide dialogul pre-completat la edit", async () => {
    renderSection();
    const editBtns = screen.getAllByLabelText("trucks.actions.edit");
    await userEvent.click(editBtns[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/trucks\.fields\.plateNumber/i)).toHaveValue("CT-01-TML");
  });

  it("apeleaza updateItem la submit valid", async () => {
    renderSection();
    const editBtns = screen.getAllByLabelText("trucks.actions.edit");
    await userEvent.click(editBtns[0]);

    fireEvent.change(screen.getByLabelText(/trucks\.fields\.brand/i), { target: { value: "Volvo Updated" } });
    await userEvent.click(screen.getByRole("button", { name: /trucks\.save/i }));

    await waitFor(() => {
      expect(updateItem).toHaveBeenCalled();
    });
  });
});

// ── CRUD Delete ────────────────────────────────────────────

describe("TrucksSection — CRUD delete", () => {
  beforeEach(() => vi.clearAllMocks());

  it("afiseaza dialog confirmare la click Delete", async () => {
    renderSection();
    const deleteBtns = screen.getAllByLabelText("trucks.actions.delete");
    // t1 e available, deci nu e disabled
    await userEvent.click(deleteBtns[0]);
    expect(screen.getByText("trucks.confirmDeleteTitle")).toBeInTheDocument();
  });

  it("apeleaza removeItem la confirmare stergere", async () => {
    renderSection();
    const deleteBtns = screen.getAllByLabelText("trucks.actions.delete");
    await userEvent.click(deleteBtns[0]);
    await userEvent.click(screen.getByRole("button", { name: /trucks\.actions\.confirm/i }));

    await waitFor(() => {
      expect(removeItem).toHaveBeenCalled();
    });
  });

  it("apeleaza updateItem sa dezasigneze soferul la stergere", async () => {
    renderSection();
    const deleteBtns = screen.getAllByLabelText("trucks.actions.delete");
    await userEvent.click(deleteBtns[0]);
    await userEvent.click(screen.getByRole("button", { name: /trucks\.actions\.confirm/i }));

    await waitFor(() => {
      expect(updateItem).toHaveBeenCalled();
    });
  });

  it("apeleaza onDataChange dupa stergere", async () => {
    renderSection();
    const deleteBtns = screen.getAllByLabelText("trucks.actions.delete");
    await userEvent.click(deleteBtns[0]);
    await userEvent.click(screen.getByRole("button", { name: /trucks\.actions\.confirm/i }));

    await waitFor(() => {
      expect(mockOnDataChange).toHaveBeenCalled();
    });
  });
});

// ── Assign driver ──────────────────────────────────────────

describe("TrucksSection — assign driver", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deschide assign dialog la click", async () => {
    renderSection();
    const assignBtns = screen.getAllByLabelText("trucks.actions.assign");
    await userEvent.click(assignBtns[0]);
    expect(screen.getByTestId("assign-dialog")).toBeInTheDocument();
  });

  it("apeleaza updateItem la confirmare assign", async () => {
    renderSection();
    const assignBtns = screen.getAllByLabelText("trucks.actions.assign");
    await userEvent.click(assignBtns[0]);

    fireEvent.change(screen.getByLabelText("assign-driver"), { target: { value: "d1" } });
    await userEvent.click(screen.getByRole("button", { name: /trucks\.actions\.assignConfirm/i }));

    await waitFor(() => {
      expect(updateItem).toHaveBeenCalled();
    });
  });

  it("apeleaza onDataChange dupa assign", async () => {
    renderSection();
    const assignBtns = screen.getAllByLabelText("trucks.actions.assign");
    await userEvent.click(assignBtns[0]);
    await userEvent.click(screen.getByRole("button", { name: /trucks\.actions\.assignConfirm/i }));

    await waitFor(() => {
      expect(mockOnDataChange).toHaveBeenCalled();
    });
  });
});

// ── Validare ───────────────────────────────────────────────

describe("TrucksSection — validare", () => {
  beforeEach(() => vi.clearAllMocks());

  it("afiseaza eroare la brand prea scurt", async () => {
    renderSection();
    await userEvent.click(screen.getByRole("button", { name: /trucks\.actions\.add/i }));

    fireEvent.change(screen.getByLabelText(/trucks\.fields\.plateNumber/i), { target: { value: "CT-03-TML" } });
    fireEvent.change(screen.getByLabelText(/trucks\.fields\.brand/i), { target: { value: "V" } });
    await userEvent.click(screen.getAllByRole("button", { name: /trucks\.actions\.add/i }).slice(-1)[0]);

    await waitFor(() => {
      expect(screen.getByText("trucks.validation.brandMin")).toBeInTheDocument();
    });
  });

  it("afiseaza eroare la year invalid", async () => {
    renderSection();
    await userEvent.click(screen.getByRole("button", { name: /trucks\.actions\.add/i }));

    fireEvent.change(screen.getByLabelText(/trucks\.fields\.plateNumber/i), { target: { value: "CT-03-TML" } });
    fireEvent.change(screen.getByLabelText(/trucks\.fields\.brand/i), { target: { value: "Volvo" } });
    fireEvent.change(screen.getByLabelText(/trucks\.fields\.model/i), { target: { value: "FH16" } });
    fireEvent.change(screen.getByLabelText(/trucks\.fields\.year/i), { target: { value: "1980" } });
    await userEvent.click(screen.getAllByRole("button", { name: /trucks\.actions\.add/i }).slice(-1)[0]);

    await waitFor(() => {
      expect(screen.getByText(/trucks\.validation\.yearRange/i)).toBeInTheDocument();
    });
  });

  it("afiseaza eroare la mileage negativ", async () => {
    renderSection();
    await userEvent.click(screen.getByRole("button", { name: /trucks\.actions\.add/i }));

    fireEvent.change(screen.getByLabelText(/trucks\.fields\.plateNumber/i), { target: { value: "CT-03-TML" } });
    fireEvent.change(screen.getByLabelText(/trucks\.fields\.brand/i), { target: { value: "Volvo" } });
    fireEvent.change(screen.getByLabelText(/trucks\.fields\.model/i), { target: { value: "FH16" } });
    fireEvent.change(screen.getByLabelText(/trucks\.fields\.year/i), { target: { value: "2022" } });
    fireEvent.change(screen.getByLabelText(/trucks\.fields\.mileage/i), { target: { value: "-100" } });
    await userEvent.click(screen.getAllByRole("button", { name: /trucks\.actions\.add/i }).slice(-1)[0]);

    await waitFor(() => {
      expect(screen.getByText("trucks.validation.mileagePositive")).toBeInTheDocument();
    });
  });
});

// ── Import CSV ─────────────────────────────────────────────

describe("TrucksSection — Import CSV", () => {
  beforeEach(() => vi.clearAllMocks());

  it("afiseaza butonul Import", () => {
    renderSection();
    expect(screen.getByRole("button", { name: /trucks\.import\.button/i })).toBeInTheDocument();
  });

  it("deschide import dialog la click", async () => {
    renderSection();
    await userEvent.click(screen.getByRole("button", { name: /trucks\.import\.button/i }));
    await waitFor(() => {
      expect(screen.getByTestId("import-dialog")).toBeInTheDocument();
    });
  });
});

// ── Export ─────────────────────────────────────────────────

describe("TrucksSection — Export", () => {
  beforeEach(() => vi.clearAllMocks());

  it("apeleaza exportTrucksPDF la click Export PDF", async () => {
    renderSection();
    await userEvent.click(screen.getByTitle("trucks.actions.export"));
    await userEvent.click(screen.getByText("trucks.actions.exportPdf"));
    expect(exportTrucksPDF).toHaveBeenCalledWith(mockTrucks, mockDrivers, expect.any(Function));
  });

  it("apeleaza exportTrucksExcel la click Export Excel", async () => {
    renderSection();
    await userEvent.click(screen.getByTitle("trucks.actions.export"));
    await userEvent.click(screen.getByText("trucks.actions.exportExcel"));
    expect(exportTrucksExcel).toHaveBeenCalledWith(mockTrucks, mockDrivers, expect.any(Function));
  });

  it("apeleaza exportTrucksCSV la click Export CSV", async () => {
    renderSection();
    await userEvent.click(screen.getByTitle("trucks.actions.export"));
    await userEvent.click(screen.getByText("trucks.actions.exportCsv"));
    expect(exportTrucksCSV).toHaveBeenCalledWith(mockTrucks, mockDrivers, expect.any(Function));
  });
});