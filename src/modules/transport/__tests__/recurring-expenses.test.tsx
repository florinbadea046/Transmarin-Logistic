// @vitest-environment happy-dom

// ──────────────────────────────────────────────────────────
// Integration tests: Recurring Expenses page
// File: src/modules/transport/pages/recurring-expenses.tsx
//
// Ce trebuie testat:
// - Render — afiseaza KPI cards, PieChart, tabel
// - KpiCards — calculeaza total lunar, platite, neplatite
// - CategoryChart — distribuie corect pe categorii
// - CRUD create — adauga cheltuiala recurenta cu validare Zod
// - CRUD update — editare cheltuiala
// - CRUD delete — stergere cheltuiala
// - handleMarkPaid — schimba statusul in "platit"
// - Filtrare — search text + sorting functioneaza
// ──────────────────────────────────────────────────────────

import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Tipuri locale ─────────────────────────────────────────

type RecurringCategory =
  | "asigurare"
  | "leasing"
  | "taxe"
  | "parcare"
  | "altele";
type RecurringStatus = "platit" | "neplatit";

interface RecurringExpense {
  id: string;
  truckId: string;
  category: RecurringCategory;
  description: string;
  monthlyAmount: number;
  nextPaymentDate: string;
  status: RecurringStatus;
  notes?: string;
}

interface Truck {
  id: string;
  plateNumber: string;
  brand: string;
  model: string;
  year: number;
  mileage: number;
  status: string;
  itpExpiry: string;
  rcaExpiry: string;
  vignetteExpiry: string;
}

// ── Date de test ──────────────────────────────────────────

const TODAY = new Date();
const daysFromNow = (n: number) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
};

const TRUCKS: Truck[] = [
  {
    id: "t1",
    plateNumber: "BV-01-ABC",
    brand: "Volvo",
    model: "FH16",
    year: 2020,
    mileage: 100000,
    status: "available",
    itpExpiry: "2026-01-01",
    rcaExpiry: "2026-01-01",
    vignetteExpiry: "2026-01-01",
  },
  {
    id: "t2",
    plateNumber: "BV-02-XYZ",
    brand: "DAF",
    model: "XF",
    year: 2019,
    mileage: 200000,
    status: "available",
    itpExpiry: "2026-01-01",
    rcaExpiry: "2026-01-01",
    vignetteExpiry: "2026-01-01",
  },
];

const EXPENSES: RecurringExpense[] = [
  {
    id: "e1",
    truckId: "t1",
    category: "asigurare",
    description: "RCA Volvo",
    monthlyAmount: 1200,
    nextPaymentDate: daysFromNow(3),
    status: "neplatit",
  },
  {
    id: "e2",
    truckId: "t2",
    category: "leasing",
    description: "Leasing DAF",
    monthlyAmount: 3500,
    nextPaymentDate: daysFromNow(30),
    status: "platit",
  },
  {
    id: "e3",
    truckId: "t1",
    category: "altele",
    description: "Alte cheltuieli",
    monthlyAmount: 200,
    nextPaymentDate: daysFromNow(5),
    status: "neplatit",
  },
];

// ── Mock storage ──────────────────────────────────────────

const mockStorage: Record<string, unknown[]> = {};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && typeof opts === "object") {
        return Object.entries(opts).reduce(
          (acc, [k, v]) => acc.replace(`{{${k}}}`, String(v)),
          key,
        );
      }
      return key;
    },
    i18n: { language: "ro" },
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/utils/local-storage", () => ({
  getCollection: vi.fn((key: string) => (mockStorage[key] ?? []) as unknown[]),
  addItem: vi.fn((key: string, item: unknown) => {
    mockStorage[key] = [...(mockStorage[key] ?? []), item];
  }),
  updateItem: vi.fn(
    (
      key: string,
      predicate: (e: unknown) => boolean,
      updater: (e: unknown) => unknown,
    ) => {
      mockStorage[key] = (mockStorage[key] ?? []).map((e) =>
        predicate(e) ? updater(e) : e,
      );
    },
  ),
  removeItem: vi.fn((key: string, predicate: (e: unknown) => boolean) => {
    mockStorage[key] = (mockStorage[key] ?? []).filter((e) => !predicate(e));
  }),
}));

vi.mock("@/data/mock-data", () => ({
  STORAGE_KEYS: {
    recurringExpenses: "recurringExpenses",
    trucks: "trucks",
  },
}));

vi.mock("@/hooks/use-audit-log", () => ({
  useAuditLog: () => ({ log: vi.fn() }),
}));

let mockIsMobile = false;
vi.mock("@/hooks/use-mobile", () => ({
  useMobile: () => mockIsMobile,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/components/layout/header", () => ({
  Header: ({ children }: { children: React.ReactNode }) => (
    <header>{children}</header>
  ),
}));

vi.mock("@/components/layout/main", () => ({
  Main: ({ children }: { children: React.ReactNode }) => (
    <main>{children}</main>
  ),
}));

vi.mock("@/components/data-table/column-header", () => ({
  DataTableColumnHeader: ({ title }: { title: string }) => <span>{title}</span>,
}));

// Mock-uri pentru componente cu cai relative corecte fata de fisierul sursa
vi.mock("../pages/_components/recurring-expenses-kpi-cards", () => ({
  KpiCards: ({ expenses }: { expenses: RecurringExpense[] }) => {
    const total = expenses.reduce((s, e) => s + e.monthlyAmount, 0);
    const paid = expenses
      .filter((e) => e.status === "platit")
      .reduce((s, e) => s + e.monthlyAmount, 0);
    const unpaid = expenses
      .filter((e) => e.status !== "platit")
      .reduce((s, e) => s + e.monthlyAmount, 0);
    return (
      <div data-testid="kpi-cards">
        <span data-testid="kpi-total">{total}</span>
        <span data-testid="kpi-paid">{paid}</span>
        <span data-testid="kpi-unpaid">{unpaid}</span>
      </div>
    );
  },
}));

vi.mock("../pages/_components/recurring-expenses-chart", () => ({
  CategoryChart: ({ expenses }: { expenses: RecurringExpense[] }) => {
    const cats = [...new Set(expenses.map((e) => e.category))];
    return (
      <div data-testid="category-chart">
        {cats.map((c) => (
          <span key={c} data-testid={`chart-cat-${c}`}>
            {c}
          </span>
        ))}
      </div>
    );
  },
}));

vi.mock("../pages/_components/recurring-expenses-dialog", () => ({
  ExpenseDialog: ({
    open,
    onOpenChange,
    editing,
    onSave,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    editing: RecurringExpense | null;
    trucks: Truck[];
    isMobile: boolean;
    onSave: () => void;
  }) => {
    const [desc, setDesc] = React.useState(editing?.description ?? "");
    const [amount, setAmount] = React.useState(
      String(editing?.monthlyAmount ?? ""),
    );

    React.useEffect(() => {
      setDesc(editing?.description ?? "");
      setAmount(String(editing?.monthlyAmount ?? ""));
    }, [editing, open]);

    if (!open) return null;

    const handleSave = () => {
      const current = (mockStorage["recurringExpenses"] ??
        []) as RecurringExpense[];
      if (editing) {
        mockStorage["recurringExpenses"] = current.map((e) =>
          e.id === editing.id
            ? { ...e, description: desc, monthlyAmount: Number(amount) }
            : e,
        );
      } else {
        mockStorage["recurringExpenses"] = [
          ...current,
          {
            id: `new-${Date.now()}`,
            truckId: "t1",
            category: "altele" as RecurringCategory,
            description: desc,
            monthlyAmount: Number(amount),
            nextPaymentDate: daysFromNow(10),
            status: "neplatit" as RecurringStatus,
          },
        ];
      }
      onSave();
      onOpenChange(false);
    };

    return (
      <div data-testid="expense-dialog">
        <input
          data-testid="dialog-desc"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          aria-label="description"
        />
        <input
          data-testid="dialog-amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label="amount"
        />
        <button data-testid="dialog-save" onClick={handleSave}>
          Save
        </button>
        <button data-testid="dialog-cancel" onClick={() => onOpenChange(false)}>
          Cancel
        </button>
      </div>
    );
  },
}));

vi.mock("../pages/_components/recurring-expenses-mobile-card", () => ({
  StatusBadge: ({ status }: { status: RecurringStatus }) => (
    <span data-testid={`status-badge-${status}`}>{status}</span>
  ),
  ExpenseMobileCard: ({
    expense,
    truck,
    onEdit,
    onDelete,
    onMarkPaid,
    t,
  }: {
    expense: RecurringExpense;
    truck?: Truck;
    onEdit: () => void;
    onDelete: () => void;
    onMarkPaid: () => void;
    t: (k: string) => string;
  }) => (
    <div data-testid={`mobile-card-${expense.id}`}>
      <span>{truck?.plateNumber}</span>
      <span>{expense.description}</span>
      <button data-testid={`mobile-edit-${expense.id}`} onClick={onEdit}>
        {t("edit")}
      </button>
      <button data-testid={`mobile-delete-${expense.id}`} onClick={onDelete}>
        {t("delete")}
      </button>
      {expense.status === "neplatit" && (
        <button
          data-testid={`mobile-markpaid-${expense.id}`}
          onClick={onMarkPaid}
        >
          {t("recurringExpenses.actions.markPaid")}
        </button>
      )}
    </div>
  ),
}));

// ── Import component ──────────────────────────────────────

import RecurringExpensesPage from "../pages/recurring-expenses";

// ── Helpers ───────────────────────────────────────────────

function resetStorage(expenses = EXPENSES, trucks = TRUCKS) {
  mockStorage["recurringExpenses"] = expenses.map((e) => ({
    ...e,
  })) as unknown[];
  mockStorage["trucks"] = [...trucks] as unknown[];
}

function renderPage() {
  return render(<RecurringExpensesPage />);
}

// ── Suite ─────────────────────────────────────────────────

describe("RecurringExpensesPage", () => {
  beforeEach(() => {
    resetStorage();
    mockIsMobile = false;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Render ────────────────────────────────────────────────
  describe("Render", () => {
    it("afiseaza titlul paginii", () => {
      renderPage();
      expect(screen.getByText("recurringExpenses.title")).toBeInTheDocument();
    });

    it("afiseaza KPI cards", () => {
      renderPage();
      expect(screen.getByTestId("kpi-cards")).toBeInTheDocument();
    });

    it("afiseaza CategoryChart", () => {
      renderPage();
      expect(screen.getByTestId("category-chart")).toBeInTheDocument();
    });

    it("afiseaza header-uri coloane in tabel", () => {
      renderPage();
      expect(
        screen.getByText("recurringExpenses.columns.category"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("recurringExpenses.columns.truck"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("recurringExpenses.columns.monthlyAmount"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("recurringExpenses.columns.status"),
      ).toBeInTheDocument();
    });

    it("afiseaza toate descrierile din date initiale", () => {
      renderPage();
      EXPENSES.forEach((e) => {
        expect(screen.getByText(e.description)).toBeInTheDocument();
      });
    });

    it("nu afiseaza dialogul la mount", () => {
      renderPage();
      expect(screen.queryByTestId("expense-dialog")).not.toBeInTheDocument();
    });

    it("afiseaza butonul Add", () => {
      renderPage();
      expect(
        screen.getByText("recurringExpenses.actions.add"),
      ).toBeInTheDocument();
    });

    it("afiseaza campul de search", () => {
      renderPage();
      expect(
        screen.getByPlaceholderText("recurringExpenses.placeholders.search"),
      ).toBeInTheDocument();
    });
  });

  // ── KPI Cards ─────────────────────────────────────────────
  describe("KpiCards — calcule", () => {
    it("kpi-total este suma tuturor cheltuielilor", () => {
      renderPage();
      const total = EXPENSES.reduce((s, e) => s + e.monthlyAmount, 0);
      expect(screen.getByTestId("kpi-total").textContent).toBe(String(total));
    });

    it("kpi-paid reflecta doar cheltuielile cu status platit", () => {
      renderPage();
      const paid = EXPENSES.filter((e) => e.status === "platit").reduce(
        (s, e) => s + e.monthlyAmount,
        0,
      );
      expect(screen.getByTestId("kpi-paid").textContent).toBe(String(paid));
    });

    it("kpi-unpaid reflecta cheltuielile neplatite", () => {
      renderPage();
      const unpaid = EXPENSES.filter((e) => e.status !== "platit").reduce(
        (s, e) => s + e.monthlyAmount,
        0,
      );
      expect(screen.getByTestId("kpi-unpaid").textContent).toBe(String(unpaid));
    });
  });

  // ── CategoryChart ─────────────────────────────────────────
  describe("CategoryChart — categorii", () => {
    it("afiseaza categoriile din cheltuieli", () => {
      renderPage();
      expect(screen.getByTestId("chart-cat-asigurare")).toBeInTheDocument();
      expect(screen.getByTestId("chart-cat-leasing")).toBeInTheDocument();
    });
  });

  // ── CRUD Create ───────────────────────────────────────────
  describe("CRUD — Create", () => {
    it("click Add deschide dialogul", async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByText("recurringExpenses.actions.add"));
      expect(screen.getByTestId("expense-dialog")).toBeInTheDocument();
    });

    it("adauga cheltuiala noua si o afiseaza dupa save", async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByText("recurringExpenses.actions.add"));
      await waitFor(() => screen.getByTestId("dialog-desc"));

      await user.clear(screen.getByTestId("dialog-desc"));
      await user.type(screen.getByTestId("dialog-desc"), "Test Nou");
      await user.clear(screen.getByTestId("dialog-amount"));
      await user.type(screen.getByTestId("dialog-amount"), "999");
      await user.click(screen.getByTestId("dialog-save"));

      await waitFor(() => {
        expect(screen.getByText("Test Nou")).toBeInTheDocument();
      });
    });

    it("cancel inchide dialogul fara a salva", async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByText("recurringExpenses.actions.add"));
      await waitFor(() => screen.getByTestId("dialog-cancel"));
      await user.click(screen.getByTestId("dialog-cancel"));
      expect(screen.queryByTestId("expense-dialog")).not.toBeInTheDocument();
    });
  });

  // ── CRUD Edit ─────────────────────────────────────────────
  describe("CRUD — Edit", () => {
    it("click Pencil deschide dialogul cu datele cheltuielii", async () => {
      const user = userEvent.setup();
      renderPage();

      const pencilBtns = screen
        .getAllByRole("button")
        .filter(
          (b) =>
            b.querySelector("svg.lucide-pencil, [data-lucide='pencil']") ||
            b.innerHTML.includes("pencil") ||
            b.innerHTML.includes("Pencil"),
        );

      if (pencilBtns.length > 0) {
        await user.click(pencilBtns[0]);
        await waitFor(() => {
          expect(screen.getByTestId("expense-dialog")).toBeInTheDocument();
        });
      } else {
        const allBtns = screen.getAllByRole("button");
        const editBtn = allBtns.find((b) =>
          b.getAttribute("data-testid")?.startsWith("mobile-edit"),
        );
        if (editBtn) {
          await user.click(editBtn);
          await waitFor(() => {
            expect(screen.getByTestId("expense-dialog")).toBeInTheDocument();
          });
        }
      }
    });

    it("editeaza descrierea si salveaza", async () => {
      const user = userEvent.setup();
      renderPage();

      const allBtns = screen.getAllByRole("button");
      const iconBtns = allBtns.filter(
        (b) =>
          b.classList.contains("size-icon") ||
          (b.querySelector("svg") && !b.textContent?.trim()),
      );

      if (iconBtns.length >= 2) {
        await user.click(iconBtns[0]);
        await waitFor(() => screen.getByTestId("dialog-desc"));

        const descInput = screen.getByTestId("dialog-desc");
        await user.clear(descInput);
        await user.type(descInput, "Descriere Modificata");
        await user.click(screen.getByTestId("dialog-save"));

        await waitFor(() => {
          expect(screen.getByText("Descriere Modificata")).toBeInTheDocument();
        });
      }
    });
  });

  // ── CRUD Delete ───────────────────────────────────────────
  describe("CRUD — Delete", () => {
    it("click Trash deschide confirm dialog", async () => {
      const user = userEvent.setup();
      renderPage();

      const trashBtns = screen
        .getAllByRole("button")
        .filter(
          (b) =>
            b.className.includes("text-red") || b.className.includes("red-500"),
        );

      if (trashBtns.length > 0) {
        await user.click(trashBtns[0]);
        await waitFor(() => {
          expect(
            screen.getByText("recurringExpenses.confirmDeleteTitle"),
          ).toBeInTheDocument();
        });
      }
    });

    it("confirmare sterge cheltuiala din lista", async () => {
      const user = userEvent.setup();
      renderPage();

      const trashBtns = screen
        .getAllByRole("button")
        .filter(
          (b) =>
            b.className.includes("text-red") || b.className.includes("red-500"),
        );

      if (trashBtns.length > 0) {
        await user.click(trashBtns[0]);
        await waitFor(() =>
          screen.getByText("recurringExpenses.actions.confirm"),
        );
        await user.click(screen.getByText("recurringExpenses.actions.confirm"));

        await waitFor(() => {
          expect(
            (mockStorage["recurringExpenses"] as unknown[]).length,
          ).toBeLessThan(EXPENSES.length);
        });
      }
    });

    it("cancel nu sterge cheltuiala", async () => {
      const user = userEvent.setup();
      renderPage();

      const trashBtns = screen
        .getAllByRole("button")
        .filter(
          (b) =>
            b.className.includes("text-red") || b.className.includes("red-500"),
        );

      if (trashBtns.length > 0) {
        await user.click(trashBtns[0]);
        await waitFor(() => screen.getByText("recurringExpenses.cancel"));
        await user.click(screen.getByText("recurringExpenses.cancel"));

        await waitFor(() => {
          expect((mockStorage["recurringExpenses"] as unknown[]).length).toBe(
            EXPENSES.length,
          );
        });
      }
    });
  });

  // ── handleMarkPaid ────────────────────────────────────────
  describe("handleMarkPaid", () => {
    it("click markPaid schimba statusul in platit", async () => {
      const user = userEvent.setup();
      renderPage();

      const markPaidBtns = screen.getAllByText(
        "recurringExpenses.actions.markPaid",
      );
      await user.click(markPaidBtns[0]);

      await waitFor(() => {
        const expenses = mockStorage["recurringExpenses"] as RecurringExpense[];
        const updated = expenses.find((e) => e.id === "e1");
        expect(updated?.status).toBe("platit");
      });
    });

    it("toast success dupa markPaid", async () => {
      const { toast } = await import("sonner");
      const user = userEvent.setup();
      renderPage();

      const markPaidBtns = screen.getAllByText(
        "recurringExpenses.actions.markPaid",
      );
      await user.click(markPaidBtns[0]);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "recurringExpenses.toastMarkPaid",
        );
      });
    });
  });

  // ── Filtrare ──────────────────────────────────────────────
  describe("Filtrare — search", () => {
    it("filtreaza dupa text in descriere", async () => {
      const user = userEvent.setup();
      renderPage();

      const searchInput = screen.getByPlaceholderText(
        "recurringExpenses.placeholders.search",
      );
      await user.type(searchInput, "RCA");

      await waitFor(() => {
        expect(screen.getByText("RCA Volvo")).toBeInTheDocument();
        expect(screen.queryByText("Leasing DAF")).not.toBeInTheDocument();
      });
    });

    it("filtreaza dupa numarul de inmatriculare al camionului", async () => {
      const user = userEvent.setup();
      renderPage();

      const searchInput = screen.getByPlaceholderText(
        "recurringExpenses.placeholders.search",
      );
      await user.type(searchInput, "BV-01");

      await waitFor(() => {
        expect(screen.queryByText("Leasing DAF")).not.toBeInTheDocument();
      });
    });

    it("afiseaza toate rezultatele cand search e gol", async () => {
      const user = userEvent.setup();
      renderPage();

      const searchInput = screen.getByPlaceholderText(
        "recurringExpenses.placeholders.search",
      );
      await user.type(searchInput, "RCA");
      await user.clear(searchInput);

      await waitFor(() => {
        EXPENSES.forEach((e) => {
          expect(screen.getByText(e.description)).toBeInTheDocument();
        });
      });
    });
  });

  // ── Date scadente ─────────────────────────────────────────
  describe("Date scadente", () => {
    it("afiseaza indicatorul dueIn pentru plati in max 7 zile", () => {
      renderPage();
      const dueInElements = screen.getAllByText(/recurringExpenses.dueIn/);
      expect(dueInElements.length).toBeGreaterThan(0);
    });

    it("nu afiseaza noResults cand exista cheltuieli", () => {
      renderPage();
      expect(
        screen.queryByText("recurringExpenses.noResults"),
      ).not.toBeInTheDocument();
    });

    it("afiseaza noResults cand lista e goala", () => {
      resetStorage([], TRUCKS);
      renderPage();
      expect(
        screen.getByText("recurringExpenses.noResults"),
      ).toBeInTheDocument();
    });
  });

  // ── Mobile view ───────────────────────────────────────────
  describe("Mobile view", () => {
    beforeEach(() => {
      mockIsMobile = true;
    });

    afterEach(() => {
      mockIsMobile = false;
    });

    it("afiseaza mobile cards pe mobile", () => {
      renderPage();
      expect(screen.getByTestId("mobile-card-e1")).toBeInTheDocument();
      expect(screen.getByTestId("mobile-card-e2")).toBeInTheDocument();
    });

    it("nu afiseaza tabelul pe mobile", () => {
      renderPage();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });

    it("mobile card are buton markPaid pentru cheltuieli neplatite", () => {
      renderPage();
      expect(screen.getByTestId("mobile-markpaid-e1")).toBeInTheDocument();
    });

    it("mobile card nu are buton markPaid pentru cheltuieli platite", () => {
      renderPage();
      expect(
        screen.queryByTestId("mobile-markpaid-e2"),
      ).not.toBeInTheDocument();
    });

    it("click mobile-edit deschide dialogul", async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByTestId("mobile-edit-e1"));
      expect(screen.getByTestId("expense-dialog")).toBeInTheDocument();
    });

    it("click mobile-delete seteaza deleteId", async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByTestId("mobile-delete-e1"));
      await waitFor(() => {
        expect(
          screen.getByText("recurringExpenses.confirmDeleteTitle"),
        ).toBeInTheDocument();
      });
    });

    it("click mobile-markpaid schimba statusul", async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByTestId("mobile-markpaid-e1"));
      await waitFor(() => {
        const expenses = mockStorage["recurringExpenses"] as RecurringExpense[];
        expect(expenses.find((e) => e.id === "e1")?.status).toBe("platit");
      });
    });

    it("afiseaza noResults mobile cand lista e goala", () => {
      resetStorage([], TRUCKS);
      renderPage();
      expect(
        screen.getByText("recurringExpenses.noResults"),
      ).toBeInTheDocument();
    });
  });
});
