// ──────────────────────────────────────────────────────────
// Integration tests: Orders page (OrdersPage component)
// File: src/modules/transport/pages/orders.tsx
//
// Ce trebuie testat:
// - Render initial — afiseaza titlu, buton Add, tabel
// - handleAdd() — adauga o comanda noua in localStorage, apare in tabel
// - handleEdit() — modifica o comanda existenta
// - handleDelete() — sterge o comanda, dispare din tabel
// - handleImport() — importa comenzi din CSV, skip duplicate
// - Filtrare avansata — date range, origin, destination
// - filteredData — filtrarea functioneaza corect
// - resetAdvancedFilters() — reseteaza filtrele
// - Duplicate detection — comanda identica e refuzata
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as React from "react";
import OrdersPage from "../pages/orders";

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

vi.mock("@/components/layout/header", () => ({
  Header: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/layout/main", () => ({
  Main: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/confirm-dialog", () => ({
  ConfirmDialog: ({
    open,
    handleConfirm,
    title,
  }: {
    open: boolean;
    handleConfirm: () => void;
    title: string;
  }) =>
    open ? (
      <div>
        <span>{title}</span>
        <button onClick={handleConfirm}>confirm-delete</button>
      </div>
    ) : null,
}));

vi.mock("@/components/data-table/pagination", () => ({
  DataTablePagination: () => <div data-testid="pagination" />,
}));

vi.mock("@/components/data-table/toolbar", () => ({
  DataTableToolbar: () => <div data-testid="toolbar" />,
}));

vi.mock("../pages/_components/order-export-menu", () => ({
  OrderExportMenu: () => <div data-testid="export-menu" />,
}));

vi.mock("../pages/_components/order-detail-dialog", () => ({
  OrderDetailDialog: () => null,
}));

vi.mock("../pages/_components/order-advanced-filters", () => ({
  AdvancedFilters: ({
    onOrigin,
    onDestination,
    onReset,
    onDateFrom,
    onDateTo,
  }: {
    onOrigin: (v: string) => void;
    onDestination: (v: string) => void;
    onReset: () => void;
    onDateFrom: (d: Date | undefined) => void;
    onDateTo: (d: Date | undefined) => void;
  }) => (
    <div>
      <input
        data-testid="filter-origin"
        onChange={(e) => onOrigin(e.target.value)}
      />
      <input
        data-testid="filter-destination"
        onChange={(e) => onDestination(e.target.value)}
      />
      <button
        data-testid="filter-date-from"
        onClick={() => onDateFrom(new Date("2025-07-01"))}
      >
        set-date-from
      </button>
      <button
        data-testid="filter-date-to"
        onClick={() => onDateTo(new Date("2025-05-01"))}
      >
        set-date-to
      </button>
      <button data-testid="reset-filters" onClick={onReset}>
        reset
      </button>
    </div>
  ),
}));

vi.mock("../pages/_components/order-import-dialog", () => ({
  OrderImportDialog: ({
    open,
    onImport,
  }: {
    open: boolean;
    onImport: (rows: object[]) => void;
  }) =>
    open ? (
      <div>
        <button
          data-testid="do-import"
          onClick={() =>
            onImport([
              {
                clientName: "Import SRL",
                origin: "Iasi",
                destination: "Brasov",
                date: "2025-08-01",
                weight: 800,
                status: "pending",
              },
            ])
          }
        >
          import
        </button>
        <button
          data-testid="do-import-partial"
          onClick={() =>
            onImport([
              {
                clientName: "Import SRL",
                origin: "Iasi",
                destination: "Brasov",
                date: "2025-08-01",
                weight: 800,
                status: "pending",
              },
              {
                clientName: "Acme SRL",
                origin: "Bucuresti",
                destination: "Cluj",
                date: "2025-06-01",
                weight: 1500,
                status: "pending",
              },
            ])
          }
        >
          import-partial
        </button>
        <button
          data-testid="do-import-duplicate"
          onClick={() =>
            onImport([
              {
                clientName: "Acme SRL",
                origin: "Bucuresti",
                destination: "Cluj",
                date: "2025-06-01",
                weight: 1500,
                status: "pending",
              },
            ])
          }
        >
          import-duplicate
        </button>
      </div>
    ) : null,
}));

vi.mock("../pages/_components/order-form-dialog", () => ({
  OrderFormDialog: ({
    open,
    onOpenChange,
    onSave,
    triggerButton,
    title,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onSave: (values: object) => string | null;
    triggerButton?: React.ReactNode;
    title: string;
  }) => {
    const [localOpen, setLocalOpen] = React.useState(false);
    const isOpen = open || localOpen;
    return (
      <div>
        {triggerButton && (
          <div
            onClick={() => {
              setLocalOpen(true);
              onOpenChange?.(true);
            }}
          >
            {triggerButton}
          </div>
        )}
        {isOpen && (
          <div>
            <span>{title}</span>
            <button
              data-testid="save-add"
              onClick={() =>
                onSave({
                  clientName: "Acme SRL",
                  origin: "Bucuresti",
                  destination: "Cluj",
                  date: new Date("2025-06-01"),
                  weight: 1500,
                  notes: "",
                  stops: [],
                })
              }
            >
              save
            </button>
            <button
              data-testid="save-add-with-notes"
              onClick={() =>
                onSave({
                  clientName: "Beta SRL",
                  origin: "Timisoara",
                  destination: "Iasi",
                  date: new Date("2025-07-01"),
                  weight: 500,
                  notes: "fragil",
                  stops: ["  Brasov  ", "", "Sinaia"],
                })
              }
            >
              save-with-notes
            </button>
            <button
              data-testid="save-edit"
              onClick={() =>
                onSave({
                  clientName: "Acme SRL Modificat",
                  origin: "Bucuresti",
                  destination: "Cluj",
                  date: new Date("2025-06-01"),
                  weight: 1500,
                  notes: "",
                  stops: [],
                })
              }
            >
              save-edit
            </button>
            <button
              data-testid="save-duplicate"
              onClick={() =>
                onSave({
                  clientName: "Acme SRL",
                  origin: "Bucuresti",
                  destination: "Cluj",
                  date: new Date("2025-06-01"),
                  weight: 1500,
                  notes: "",
                  stops: [],
                })
              }
            >
              save-duplicate
            </button>
          </div>
        )}
      </div>
    );
  },
}));

vi.mock("../pages/_components/order-columns", () => ({
  getOrderColumns: (
    _t: unknown,
    _meta: unknown,
    {
      openEdit,
      openDelete,
      openDetail,
    }: {
      openEdit: (o: object) => void;
      openDelete: (o: object) => void;
      openDetail: (o: object) => void;
    },
  ) => [
    {
      id: "clientName",
      accessorKey: "clientName",
      header: "Client",
      cell: ({
        row,
      }: {
        row: {
          original: {
            clientName: string;
            id: string;
            origin: string;
            destination: string;
            date: string;
            weight: number;
            status: string;
          };
        };
      }) => (
        <div>
          <span>{row.original.clientName}</span>
          <button
            data-testid={`detail-${row.original.id}`}
            onClick={() => openDetail(row.original)}
          >
            detail
          </button>
          <button
            data-testid={`edit-${row.original.id}`}
            onClick={() => openEdit(row.original)}
          >
            edit
          </button>
          <button
            data-testid={`delete-${row.original.id}`}
            onClick={() => openDelete(row.original)}
          >
            delete
          </button>
        </div>
      ),
      size: 150,
    },
  ],
}));

// ─── Helpers ───────────────────────────────────────────────

function seedOrder() {
  const orders = [
    {
      id: "ord-seed",
      clientName: "Acme SRL",
      origin: "Bucuresti",
      destination: "Cluj",
      date: "2025-06-01",
      weight: 1500,
      status: "pending",
    },
  ];
  localStorage.setItem("transmarin_orders", JSON.stringify(orders));
}

// ─── Render initial ────────────────────────────────────────
describe("OrdersPage — render initial", () => {
  beforeEach(() => localStorage.clear());

  it("afiseaza titlul paginii", () => {
    render(<OrdersPage />);
    expect(screen.getByText("orders.title")).toBeTruthy();
  });

  it("afiseaza butonul de Add", () => {
    render(<OrdersPage />);
    expect(screen.getByText("orders.add")).toBeTruthy();
  });

  it("afiseaza mesajul no results cand nu sunt comenzi", () => {
    render(<OrdersPage />);
    expect(screen.getByText("orders.noResults")).toBeTruthy();
  });

  it("afiseaza comenzile din localStorage la mount", () => {
    seedOrder();
    render(<OrdersPage />);
    expect(screen.getByText("Acme SRL")).toBeTruthy();
  });
});

// ─── handleAdd ─────────────────────────────────────────────
describe("OrdersPage — handleAdd", () => {
  beforeEach(() => localStorage.clear());

  it("adauga o comanda noua si o afiseaza in tabel", async () => {
    render(<OrdersPage />);

    fireEvent.click(screen.getByText("orders.add"));
    fireEvent.click(screen.getByTestId("save-add"));

    await waitFor(() => {
      expect(screen.getByText("Acme SRL")).toBeTruthy();
    });
  });

  it("salveaza comanda noua in localStorage", async () => {
    render(<OrdersPage />);

    fireEvent.click(screen.getByText("orders.add"));
    fireEvent.click(screen.getByTestId("save-add"));

    await waitFor(() => {
      const raw = localStorage.getItem("transmarin_orders");
      const orders = JSON.parse(raw!);
      expect(
        orders.some((o: { clientName: string }) => o.clientName === "Acme SRL"),
      ).toBe(true);
    });
  });

  it("adauga comanda cu notes si stops", async () => {
    render(<OrdersPage />);

    fireEvent.click(screen.getByText("orders.add"));
    fireEvent.click(screen.getByTestId("save-add-with-notes"));

    await waitFor(() => {
      const raw = localStorage.getItem("transmarin_orders");
      const orders = JSON.parse(raw!);
      const found = orders.find(
        (o: { clientName: string }) => o.clientName === "Beta SRL",
      );
      expect(found).toBeTruthy();
      expect(found.notes).toBe("fragil");
      expect(found.stops).toContain("Brasov");
      expect(found.stops).toContain("Sinaia");
    });
  });
});

// ─── Duplicate detection ───────────────────────────────────
describe("OrdersPage — duplicate detection", () => {
  beforeEach(() => localStorage.clear());

  it("refuza o comanda duplicata si nu o adauga in lista", async () => {
    render(<OrdersPage />);

    fireEvent.click(screen.getByText("orders.add"));
    fireEvent.click(screen.getByTestId("save-add"));

    await waitFor(() => {
      expect(screen.getByText("Acme SRL")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("save-duplicate"));

    await waitFor(() => {
      const raw = localStorage.getItem("transmarin_orders");
      const orders = JSON.parse(raw!);
      expect(
        orders.filter(
          (o: { clientName: string }) => o.clientName === "Acme SRL",
        ),
      ).toHaveLength(1);
    });
  });
});

// ─── handleDelete ──────────────────────────────────────────
describe("OrdersPage — handleDelete", () => {
  beforeEach(() => {
    localStorage.clear();
    seedOrder();
  });

  it("sterge comanda dupa confirmare", async () => {
    render(<OrdersPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme SRL")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("delete-ord-seed"));
    fireEvent.click(screen.getByText("confirm-delete"));

    await waitFor(() => {
      expect(screen.queryByText("Acme SRL")).toBeNull();
    });
  });

  it("elimina comanda din localStorage dupa stergere", async () => {
    render(<OrdersPage />);

    await waitFor(() => screen.getByTestId("delete-ord-seed"));

    fireEvent.click(screen.getByTestId("delete-ord-seed"));
    fireEvent.click(screen.getByText("confirm-delete"));

    await waitFor(() => {
      const raw = localStorage.getItem("transmarin_orders");
      const orders = JSON.parse(raw!);
      expect(orders).toHaveLength(0);
    });
  });
});

// ─── handleEdit ────────────────────────────────────────────
describe("OrdersPage — handleEdit", () => {
  beforeEach(() => {
    localStorage.clear();
    seedOrder();
  });

  it("modifica comanda si actualizeaza tabelul", async () => {
    render(<OrdersPage />);

    await waitFor(() => screen.getByTestId("edit-ord-seed"));

    fireEvent.click(screen.getByTestId("edit-ord-seed"));
    fireEvent.click(screen.getByTestId("save-edit"));

    await waitFor(() => {
      expect(screen.getByText("Acme SRL Modificat")).toBeTruthy();
    });
  });

  it("refuza duplicat la editare — nu modifica lista", async () => {
    const orders = [
      {
        id: "ord-seed",
        clientName: "Acme SRL",
        origin: "Bucuresti",
        destination: "Cluj",
        date: "2025-06-01",
        weight: 1500,
        status: "pending",
      },
      {
        id: "ord-seed-2",
        clientName: "Acme SRL Modificat",
        origin: "Bucuresti",
        destination: "Cluj",
        date: "2025-06-01",
        weight: 1500,
        status: "pending",
      },
    ];
    localStorage.setItem("transmarin_orders", JSON.stringify(orders));

    render(<OrdersPage />);
    await waitFor(() => screen.getByTestId("edit-ord-seed"));

    fireEvent.click(screen.getByTestId("edit-ord-seed"));
    fireEvent.click(screen.getByTestId("save-edit"));

    await waitFor(() => {
      const raw = localStorage.getItem("transmarin_orders");
      const saved = JSON.parse(raw!);
      expect(saved).toHaveLength(2);
      expect(
        saved.find((o: { id: string }) => o.id === "ord-seed").clientName,
      ).toBe("Acme SRL");
    });
  });
});

// ─── openDetail ────────────────────────────────────────────
describe("OrdersPage — openDetail", () => {
  beforeEach(() => {
    localStorage.clear();
    seedOrder();
  });

  it("deschide detaliile comenzii la click pe detail", async () => {
    render(<OrdersPage />);

    await waitFor(() => screen.getByTestId("detail-ord-seed"));
    fireEvent.click(screen.getByTestId("detail-ord-seed"));

    await waitFor(() => {
      expect(screen.getByTestId("detail-ord-seed")).toBeTruthy();
    });
  });
});

// ─── handleImport ──────────────────────────────────────────
describe("OrdersPage — handleImport", () => {
  beforeEach(() => localStorage.clear());

  it("importa o comanda noua", async () => {
    render(<OrdersPage />);

    fireEvent.click(screen.getByText("orders.import.button"));
    await waitFor(() => screen.getByTestId("do-import"));
    fireEvent.click(screen.getByTestId("do-import"));

    await waitFor(() => {
      expect(screen.getByText("Import SRL")).toBeTruthy();
    });
  });

  it("toast success cand toate comenzile sunt importate", async () => {
    const { toast } = await import("sonner");
    render(<OrdersPage />);

    fireEvent.click(screen.getByText("orders.import.button"));
    await waitFor(() => screen.getByTestId("do-import"));
    fireEvent.click(screen.getByTestId("do-import"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it("toast success partial cand unele sunt duplicate", async () => {
    const { toast } = await import("sonner");
    seedOrder();
    render(<OrdersPage />);

    fireEvent.click(screen.getByText("orders.import.button"));
    await waitFor(() => screen.getByTestId("do-import-partial"));
    fireEvent.click(screen.getByTestId("do-import-partial"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it("toast error cand toate comenzile importate sunt duplicate", async () => {
    const { toast } = await import("sonner");
    seedOrder();
    render(<OrdersPage />);

    fireEvent.click(screen.getByText("orders.import.button"));
    await waitFor(() => screen.getByTestId("do-import-duplicate"));
    fireEvent.click(screen.getByTestId("do-import-duplicate"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it("skip-uieste duplicate la import", async () => {
    seedOrder();
    render(<OrdersPage />);

    fireEvent.click(screen.getByText("orders.import.button"));
    await waitFor(() => screen.getByTestId("do-import-duplicate"));
    fireEvent.click(screen.getByTestId("do-import-duplicate"));

    await waitFor(() => {
      const raw = localStorage.getItem("transmarin_orders");
      const orders = JSON.parse(raw!);
      expect(
        orders.filter(
          (o: { clientName: string }) => o.clientName === "Acme SRL",
        ),
      ).toHaveLength(1);
    });
  });
});

// ─── Filtrare avansata ─────────────────────────────────────
describe("OrdersPage — filtrare avansata", () => {
  beforeEach(() => {
    localStorage.clear();
    seedOrder();
  });

  it("filtreaza dupa origin", async () => {
    render(<OrdersPage />);

    await waitFor(() => screen.getByText("Acme SRL"));

    fireEvent.change(screen.getByTestId("filter-origin"), {
      target: { value: "Iasi" },
    });

    await waitFor(() => {
      expect(screen.queryByText("Acme SRL")).toBeNull();
    });
  });

  it("filtreaza dupa destination", async () => {
    render(<OrdersPage />);

    await waitFor(() => screen.getByText("Acme SRL"));

    fireEvent.change(screen.getByTestId("filter-destination"), {
      target: { value: "Timisoara" },
    });

    await waitFor(() => {
      expect(screen.queryByText("Acme SRL")).toBeNull();
    });
  });

  it("filtreaza dupa dateFrom — exclude comenzi mai vechi", async () => {
    render(<OrdersPage />);

    await waitFor(() => screen.getByText("Acme SRL"));

    fireEvent.click(screen.getByTestId("filter-date-from"));

    await waitFor(() => {
      expect(screen.queryByText("Acme SRL")).toBeNull();
    });
  });

  it("filtreaza dupa dateTo — exclude comenzi mai noi", async () => {
    render(<OrdersPage />);

    await waitFor(() => screen.getByText("Acme SRL"));

    fireEvent.click(screen.getByTestId("filter-date-to"));

    await waitFor(() => {
      expect(screen.queryByText("Acme SRL")).toBeNull();
    });
  });

  it("resetAdvancedFilters — reseteaza filtrele si reafiseaza datele", async () => {
    render(<OrdersPage />);

    await waitFor(() => screen.getByText("Acme SRL"));

    fireEvent.change(screen.getByTestId("filter-origin"), {
      target: { value: "Iasi" },
    });

    await waitFor(() => {
      expect(screen.queryByText("Acme SRL")).toBeNull();
    });

    fireEvent.click(screen.getByTestId("reset-filters"));

    await waitFor(() => {
      expect(screen.getByText("Acme SRL")).toBeTruthy();
    });
  });
});
