// @vitest-environment happy-dom

// ──────────────────────────────────────────────────────────
// Component tests: Trip form dialog
// File: src/modules/transport/pages/_components/trips-form-dialog.tsx
//
// Ce trebuie testat:
// - Render in modul "add" — form gol, titlu "Adauga"
// - Render in modul "edit" — form pre-populat cu datele cursei
// - Zod validation — campuri obligatorii (orderId, driverId, truckId)
// - Validation — estimatedArrivalDate >= departureDate
// - Submit create — salveaza cursa noua, updateaza order + driver status
// - Submit edit — updateaza cursa existenta
// - Checkbox "neprogramata" — ascunde campurile de date
// - Numeric inputs — accepta doar numere pozitive
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TripFormDialog } from "../pages/_components/trips-form-dialog";
import type { Trip, Order, Driver, Truck } from "../types";
import { addItem, updateItem } from "../../../utils/local-storage";

// ─── Mock-uri ──────────────────────────────────────────────

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/hooks/use-audit-log", () => ({
  useAuditLog: () => ({ log: vi.fn() }),
}));

vi.mock("../../../utils/local-storage", () => ({
  addItem: vi.fn(),
  updateItem: vi.fn(),
  generateId: vi.fn().mockReturnValue("new-trip-id"),
  getCollection: vi.fn().mockReturnValue([]),
}));

vi.mock("@/data/mock-data", () => ({
  STORAGE_KEYS: {
    trips: "transmarin_trips",
    orders: "transmarin_orders",
    drivers: "transmarin_drivers",
  },
}));

// ─── Mock zodResolver cu flag controlabil ────────────────
let __bypassZodResolver = false;

vi.mock("@hookform/resolvers/zod", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@hookform/resolvers/zod")>();
  return {
    ...actual,
    zodResolver: (...args: Parameters<typeof actual.zodResolver>) => {
      if (__bypassZodResolver) {
        return async () => ({
          values: {
            orderId: "ord-1",
            driverId: "drv-1",
            truckId: "trk-1",
            departureDate: "2025-06-01",
            estimatedArrivalDate: "2025-06-02",
            kmLoaded: 300,
            kmEmpty: 50,
            fuelCost: 450,
            revenue: 1200,
            status: "planned",
            unscheduled: false,
          },
          errors: {},
        });
      }
      return actual.zodResolver(...args);
    },
  };
});

// ─── Date de test ──────────────────────────────────────────

const sampleOrders: Order[] = [
  {
    id: "ord-1",
    clientName: "Acme SRL",
    origin: "Bucuresti",
    destination: "Cluj",
    date: "2025-06-01",
    status: "pending",
  },
  {
    id: "ord-2",
    clientName: "Beta SRL",
    origin: "Iasi",
    destination: "Timisoara",
    date: "2025-06-05",
    status: "assigned",
  },
];

const sampleDrivers: Driver[] = [
  {
    id: "drv-1",
    name: "Ion Popescu",
    phone: "0700000000",
    licenseExpiry: "2026-01-01",
    status: "available",
  },
  {
    id: "drv-2",
    name: "Gheorghe Ionescu",
    phone: "0711111111",
    licenseExpiry: "2026-06-01",
    status: "on_trip",
  },
];

const sampleTrucks: Truck[] = [
  {
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
  },
  {
    id: "trk-2",
    plateNumber: "CJ-456-DEF",
    brand: "DAF",
    model: "XF",
    year: 2019,
    mileage: 200000,
    status: "on_trip",
    itpExpiry: "2026-01-01",
    rcaExpiry: "2026-01-01",
    vignetteExpiry: "2026-01-01",
  },
];

const sampleTrip: Trip = {
  id: "trip-1",
  orderId: "ord-1",
  driverId: "drv-1",
  truckId: "trk-1",
  departureDate: "2025-06-01",
  estimatedArrivalDate: "2025-06-02",
  kmLoaded: 300,
  kmEmpty: 50,
  fuelCost: 450,
  revenue: 1200,
  status: "planned",
};

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  editingTrip: null,
  orders: sampleOrders,
  drivers: sampleDrivers,
  trucks: sampleTrucks,
  onSaved: vi.fn(),
};

// ─── Helper: selecteaza valoare Radix prin click pe trigger + option ────

async function selectRadixOption(
  triggerIndex: number,
  optionLabel: string,
): Promise<void> {
  const comboboxes = screen.getAllByRole("combobox");
  fireEvent.click(comboboxes[triggerIndex]);
  await waitFor(() => {
    const option = screen.getByRole("option", {
      name: new RegExp(optionLabel, "i"),
    });
    fireEvent.click(option);
  });
}

// ─── Render initial — modul Add ───────────────────────────
describe("TripFormDialog — render modul add", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("afiseaza titlul trips.add cand nu editeaza", () => {
    render(<TripFormDialog {...defaultProps} />);
    expect(screen.getByText("trips.add")).toBeTruthy();
  });

  it("afiseaza butonul trips.saveNew", () => {
    render(<TripFormDialog {...defaultProps} />);
    expect(screen.getByText("trips.saveNew")).toBeTruthy();
  });

  it("afiseaza butonul de cancel", () => {
    render(<TripFormDialog {...defaultProps} />);
    expect(screen.getByText("trips.cancel")).toBeTruthy();
  });

  it("afiseaza selectul pentru ordine", () => {
    render(<TripFormDialog {...defaultProps} />);
    expect(screen.getByText("trips.placeholders.order")).toBeTruthy();
  });

  it("afiseaza doar comenzile cu status eligibil", async () => {
    render(<TripFormDialog {...defaultProps} />);
    const comboboxes = screen.getAllByRole("combobox");
    fireEvent.click(comboboxes[0]);
    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: /Acme SRL — Bucuresti → Cluj/i }),
      ).toBeTruthy();
      expect(
        screen.getByRole("option", { name: /Beta SRL — Iasi → Timisoara/i }),
      ).toBeTruthy();
    });
  });

  it("afiseaza doar soferii disponibili", async () => {
    render(<TripFormDialog {...defaultProps} />);
    const comboboxes = screen.getAllByRole("combobox");
    fireEvent.click(comboboxes[1]);
    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Ion Popescu/i })).toBeTruthy();
      expect(
        screen.queryByRole("option", { name: /Gheorghe Ionescu/i }),
      ).toBeNull();
    });
  });

  it("afiseaza doar camioanele disponibile", async () => {
    render(<TripFormDialog {...defaultProps} />);
    const comboboxes = screen.getAllByRole("combobox");
    fireEvent.click(comboboxes[2]);
    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: /B-123-ABC — Volvo FH/i }),
      ).toBeTruthy();
      expect(
        screen.queryByRole("option", { name: /CJ-456-DEF — DAF XF/i }),
      ).toBeNull();
    });
  });

  it("nu afiseaza selectul de status in modul add", () => {
    render(<TripFormDialog {...defaultProps} />);
    expect(screen.queryByText("trips.fields.status")).toBeNull();
  });

  it("afiseaza campurile de data implicit", () => {
    render(<TripFormDialog {...defaultProps} />);
    expect(screen.getByText("trips.fields.departureDate")).toBeTruthy();
    expect(screen.getByText("trips.fields.arrivalDate")).toBeTruthy();
  });
});

// ─── Render modul Edit ────────────────────────────────────
describe("TripFormDialog — render modul edit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("afiseaza titlul trips.edit cand editeaza", () => {
    render(<TripFormDialog {...defaultProps} editingTrip={sampleTrip} />);
    expect(screen.getByText("trips.edit")).toBeTruthy();
  });

  it("afiseaza butonul trips.save in modul edit", () => {
    render(<TripFormDialog {...defaultProps} editingTrip={sampleTrip} />);
    expect(screen.getByText("trips.save")).toBeTruthy();
  });

  it("afiseaza selectul de status in modul edit", () => {
    render(<TripFormDialog {...defaultProps} editingTrip={sampleTrip} />);
    expect(screen.getByText("trips.fields.status")).toBeTruthy();
  });

  it("afiseaza soferul cursei la editare inclusiv on_trip", async () => {
    render(
      <TripFormDialog
        {...defaultProps}
        editingTrip={{ ...sampleTrip, driverId: "drv-2" }}
        drivers={sampleDrivers}
      />,
    );
    const comboboxes = screen.getAllByRole("combobox");
    fireEvent.click(comboboxes[1]);
    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: /Gheorghe Ionescu/i }),
      ).toBeTruthy();
    });
  });

  it("afiseaza camionul cursei la editare inclusiv on_trip", async () => {
    render(
      <TripFormDialog
        {...defaultProps}
        editingTrip={{ ...sampleTrip, truckId: "trk-2" }}
        trucks={sampleTrucks}
      />,
    );
    const comboboxes = screen.getAllByRole("combobox");
    fireEvent.click(comboboxes[2]);
    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: /CJ-456-DEF — DAF XF/i }),
      ).toBeTruthy();
    });
  });

  it("afiseaza comanda cursei la editare inclusiv in_transit", async () => {
    const transitOrder: Order = { ...sampleOrders[0], status: "in_transit" };
    render(
      <TripFormDialog
        {...defaultProps}
        editingTrip={sampleTrip}
        orders={[transitOrder]}
      />,
    );
    const comboboxes = screen.getAllByRole("combobox");
    fireEvent.click(comboboxes[0]);
    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: /Acme SRL — Bucuresti → Cluj/i }),
      ).toBeTruthy();
    });
  });
});

// ─── Checkbox unscheduled ─────────────────────────────────
describe("TripFormDialog — checkbox neprogramata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("checkbox neprogramata este debifat implicit", () => {
    render(<TripFormDialog {...defaultProps} />);
    const checkbox = document.getElementById(
      "unscheduled-check",
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it("bifare checkbox ascunde campurile de data", async () => {
    render(<TripFormDialog {...defaultProps} />);
    const checkbox = document.getElementById("unscheduled-check")!;
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(screen.queryByText("trips.fields.departureDate")).toBeNull();
      expect(screen.queryByText("trips.fields.arrivalDate")).toBeNull();
    });
  });

  it("debifarea checkbox reafiseaza campurile de data", async () => {
    render(<TripFormDialog {...defaultProps} />);
    const checkbox = document.getElementById("unscheduled-check")!;

    fireEvent.click(checkbox);
    await waitFor(() => {
      expect(screen.queryByText("trips.fields.departureDate")).toBeNull();
    });

    fireEvent.click(checkbox);
    await waitFor(() => {
      expect(screen.getByText("trips.fields.departureDate")).toBeTruthy();
    });
  });

  it("cursa fara departureDate seteaza checkbox ca bifat la editare", () => {
    render(
      <TripFormDialog
        {...defaultProps}
        editingTrip={{ ...sampleTrip, departureDate: "" }}
      />,
    );
    const checkbox = document.getElementById(
      "unscheduled-check",
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });
});

// ─── Numeric inputs ───────────────────────────────────────
describe("TripFormDialog — numeric inputs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("input kmLoaded accepta numere", () => {
    render(<TripFormDialog {...defaultProps} />);
    const inputs = screen.getAllByPlaceholderText("trips.placeholders.km");
    fireEvent.change(inputs[0], { target: { value: "250" } });
    expect((inputs[0] as HTMLInputElement).value).toBe("250");
  });

  it("input kmLoaded elimina caractere non-numerice", () => {
    render(<TripFormDialog {...defaultProps} />);
    const inputs = screen.getAllByPlaceholderText("trips.placeholders.km");
    fireEvent.change(inputs[0], { target: { value: "abc123" } });
    expect((inputs[0] as HTMLInputElement).value).toBe("123");
  });

  it("input kmLoaded arata gol cand valoarea e 0", () => {
    render(<TripFormDialog {...defaultProps} />);
    const inputs = screen.getAllByPlaceholderText("trips.placeholders.km");
    expect((inputs[0] as HTMLInputElement).value).toBe("");
  });

  it("onBlur seteaza 0 daca input e gol", () => {
    render(<TripFormDialog {...defaultProps} />);
    const inputs = screen.getAllByPlaceholderText("trips.placeholders.km");
    fireEvent.blur(inputs[0]);
    expect((inputs[0] as HTMLInputElement).value).toBe("");
  });

  it("input fuelCost accepta valori cu zecimale", () => {
    render(<TripFormDialog {...defaultProps} />);
    const inputs = screen.getAllByPlaceholderText("trips.placeholders.km");
    fireEvent.change(inputs[2], { target: { value: "123.45" } });
    expect((inputs[2] as HTMLInputElement).value).toBe("123.45");
  });
});

// ─── Cancel ───────────────────────────────────────────────
describe("TripFormDialog — cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("apeleaza onOpenChange(false) la cancel", () => {
    const onOpenChange = vi.fn();
    render(<TripFormDialog {...defaultProps} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByText("trips.cancel"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

// ─── Submit create ────────────────────────────────────────
describe("TripFormDialog — submit create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __bypassZodResolver = true;
  });

  afterEach(() => {
    __bypassZodResolver = false;
  });

  it("apeleaza addItem la submit valid", async () => {
    const onSaved = vi.fn();
    render(<TripFormDialog {...defaultProps} onSaved={onSaved} />);
    fireEvent.click(screen.getByText("trips.saveNew"));

    await waitFor(() => {
      expect(addItem).toHaveBeenCalled();
    });
  });

  it("apeleaza updateItem pentru order si driver la submit valid", async () => {
    const onSaved = vi.fn();
    render(<TripFormDialog {...defaultProps} onSaved={onSaved} />);
    fireEvent.click(screen.getByText("trips.saveNew"));

    await waitFor(() => {
      expect(updateItem).toHaveBeenCalledTimes(2);
    });
  });

  it("toast success la submit valid", async () => {
    const { toast } = await import("sonner");
    const onSaved = vi.fn();
    render(<TripFormDialog {...defaultProps} onSaved={onSaved} />);
    fireEvent.click(screen.getByText("trips.saveNew"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("trips.toast.added");
    });
  });

  it("apeleaza onSaved dupa submit valid", async () => {
    const onSaved = vi.fn();
    render(<TripFormDialog {...defaultProps} onSaved={onSaved} />);
    fireEvent.click(screen.getByText("trips.saveNew"));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
    });
  });
});

// ─── Submit edit ──────────────────────────────────────────
describe("TripFormDialog — submit edit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("apeleaza updateItem la submit edit valid", async () => {
    const onSaved = vi.fn();
    render(
      <TripFormDialog
        {...defaultProps}
        editingTrip={sampleTrip}
        onSaved={onSaved}
      />,
    );
    fireEvent.click(screen.getByText("trips.save"));

    await waitFor(() => {
      expect(updateItem).toHaveBeenCalled();
    });
  });

  it("toast success la submit edit valid", async () => {
    const { toast } = await import("sonner");
    const onSaved = vi.fn();
    render(
      <TripFormDialog
        {...defaultProps}
        editingTrip={sampleTrip}
        onSaved={onSaved}
      />,
    );
    fireEvent.click(screen.getByText("trips.save"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("trips.toast.updated");
    });
  });

  it("apeleaza onSaved dupa edit valid", async () => {
    const onSaved = vi.fn();
    render(
      <TripFormDialog
        {...defaultProps}
        editingTrip={sampleTrip}
        onSaved={onSaved}
      />,
    );
    fireEvent.click(screen.getByText("trips.save"));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
    });
  });
});

// ─── Zod validation ───────────────────────────────────────
describe("TripFormDialog — validare Zod", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("afiseaza eroare orderId daca nu e selectat", async () => {
    render(<TripFormDialog {...defaultProps} />);
    fireEvent.click(screen.getByText("trips.saveNew"));

    await waitFor(() => {
      expect(screen.getByText("trips.validation.orderRequired")).toBeTruthy();
    });
  });

  it("afiseaza eroare driverId daca nu e selectat", async () => {
    render(<TripFormDialog {...defaultProps} />);
    fireEvent.click(screen.getByText("trips.saveNew"));

    await waitFor(() => {
      expect(screen.getByText("trips.validation.driverRequired")).toBeTruthy();
    });
  });

  it("afiseaza eroare truckId daca nu e selectat", async () => {
    render(<TripFormDialog {...defaultProps} />);
    fireEvent.click(screen.getByText("trips.saveNew"));

    await waitFor(() => {
      expect(screen.getByText("trips.validation.truckRequired")).toBeTruthy();
    });
  });

  it("afiseaza eroare kmLoaded daca e 0", async () => {
    render(<TripFormDialog {...defaultProps} />);

    await selectRadixOption(0, "Acme SRL");
    await selectRadixOption(1, "Ion Popescu");
    await selectRadixOption(2, "B-123-ABC");

    fireEvent.click(screen.getByText("trips.saveNew"));

    await waitFor(() => {
      expect(
        screen.getByText("trips.validation.kmLoadedPositive"),
      ).toBeTruthy();
    });
  });

  it("nu apeleaza addItem daca validarea esueaza", async () => {
    render(<TripFormDialog {...defaultProps} />);
    fireEvent.click(screen.getByText("trips.saveNew"));

    await waitFor(() => {
      screen.getByText("trips.validation.orderRequired");
    });

    expect(addItem).not.toHaveBeenCalled();
  });
});

// ─── Error handling ───────────────────────────────────────
describe("TripFormDialog — error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __bypassZodResolver = true;
  });

  afterEach(() => {
    __bypassZodResolver = false;
  });

  it("toast error daca addItem arunca exceptie", async () => {
    const { toast } = await import("sonner");
    vi.mocked(addItem).mockImplementationOnce(() => {
      throw new Error("Storage error");
    });

    const onSaved = vi.fn();
    render(<TripFormDialog {...defaultProps} onSaved={onSaved} />);
    fireEvent.click(screen.getByText("trips.saveNew"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("trips.toast.error");
    });
  });
});
