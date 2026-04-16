// @vitest-environment happy-dom

// ──────────────────────────────────────────────────────────
// Integration tests: Trips Calendar Drag & Drop
// File: src/modules/transport/pages/trips-calendar-dnd.tsx
//
// Ce trebuie testat:
// - Calendar render — afiseaza zilele lunii curente corect
// - useData() — incarca si imbogateste cursele cu order/driver/truck
// - Trip cards — afiseaza cursele pe zilele corecte
// - Drag & drop — mutarea unei curse pe alta zi actualizeaza data
// - ConfirmMoveDialog — cere confirmare inainte de mutare
// - Sidebar — afiseaza cursele neprogramate (fara data)
// - Navigare luna — butoanele prev/next schimba luna
// - TripDetailDialog — afiseaza detaliile complete ale cursei
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as React from "react";
import TripsCalendarDndPage from "../pages/trips-calendar-dnd";
import type { Trip, Order, Driver, Truck } from "../types";

// ─── Mock-uri ──────────────────────────────────────────────

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, opts?: { returnObjects?: boolean }) => {
      if (k === "tripsCalendar.dayNames" && opts?.returnObjects) {
        return [
          "Luni",
          "Marti",
          "Miercuri",
          "Joi",
          "Vineri",
          "Sambata",
          "Duminica",
        ];
      }
      if (k === "dashboard.months" && opts?.returnObjects) {
        return [
          "Ian",
          "Feb",
          "Mar",
          "Apr",
          "Mai",
          "Iun",
          "Iul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
      }
      return k;
    },
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/hooks/use-audit-log", () => ({
  useAuditLog: () => ({ log: vi.fn() }),
}));

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/components/layout/header", () => ({
  Header: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/layout/main", () => ({
  Main: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({
    children,
    defaultValue,
    onValueChange,
  }: {
    children: React.ReactNode;
    defaultValue?: string;
    onValueChange?: (v: string) => void;
  }) => (
    <div data-testid="tabs-root" data-default={defaultValue}>
      <select
        data-testid="tabs-select"
        defaultValue={defaultValue}
        onChange={(e) => onValueChange?.(e.target.value)}
      >
        <option value="table">table</option>
        <option value="calendar">calendar</option>
        <option value="dnd">dnd</option>
        <option value="map">map</option>
      </select>
      {children}
    </div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => (
    <div role="tablist">{children}</div>
  ),
  TabsTrigger: ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => (
    <button role="tab" data-value={value}>
      {children}
    </button>
  ),
  TabsContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const mockUpdateItem = vi.fn();
const mockGetCollection = vi.fn();

vi.mock("@/utils/local-storage", () => ({
  getCollection: (...args: unknown[]) => mockGetCollection(...args),
  updateItem: (...args: unknown[]) => mockUpdateItem(...args),
}));

vi.mock("@/data/mock-data", () => ({
  STORAGE_KEYS: {
    trips: "transmarin_trips",
    orders: "transmarin_orders",
    drivers: "transmarin_drivers",
    trucks: "transmarin_trucks",
  },
}));

vi.mock("../pages/_components/trips-dnd-droppable-day", () => ({
  DroppableDay: ({
    ymd,
    day,
    isCurrentMonth,
    isToday,
    trips,
    onTripClick,
  }: {
    ymd: string;
    day: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    trips: { id: string; order?: { clientName: string } }[];
    onTripClick: (trip: unknown) => void;
  }) => (
    <div
      data-testid={`day-${ymd}`}
      data-current={isCurrentMonth}
      data-today={isToday}
    >
      <span data-testid={`day-num-${ymd}`}>{day}</span>
      {trips.map((trip) => (
        <button
          key={trip.id}
          data-testid={`trip-${trip.id}-on-${ymd}`}
          onClick={() => onTripClick(trip)}
        >
          {trip.order?.clientName ?? trip.id}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("../pages/_components/trips-dnd-cards", () => ({
  TripCard: ({ trip }: { trip: { id: string } }) => (
    <div data-testid={`trip-card-${trip.id}`}>{trip.id}</div>
  ),
  SidebarTripCard: ({
    trip,
    onClick,
  }: {
    trip: { id: string; order?: { clientName: string } };
    onClick: () => void;
  }) => (
    <button data-testid={`sidebar-trip-${trip.id}`} onClick={onClick}>
      {trip.order?.clientName ?? trip.id}
    </button>
  ),
  DetailRow: ({ label, value }: { label: string; value: string }) => (
    <div data-testid="detail-row">
      <span>{label}</span>: <span>{value}</span>
    </div>
  ),
}));

vi.mock("../pages/_components/trips-dnd-dialogs", () => ({
  TripDetailDialog: ({
    trip,
    open,
    onClose,
  }: {
    trip: { id: string; orderId: string } | null;
    open: boolean;
    onClose: () => void;
  }) =>
    open && trip ? (
      <div data-testid="trip-detail-dialog">
        <span data-testid="detail-trip-id">{trip.id}</span>
        <button data-testid="close-detail" onClick={onClose}>
          close
        </button>
      </div>
    ) : null,
  ConfirmMoveDialog: ({
    open,
    newDate,
    onConfirm,
    onCancel,
  }: {
    open: boolean;
    trip: { id: string } | null;
    newDate: string;
    onConfirm: () => void;
    onCancel: () => void;
  }) =>
    open ? (
      <div data-testid="confirm-move-dialog">
        <span data-testid="confirm-new-date">{newDate}</span>
        <button data-testid="confirm-move" onClick={onConfirm}>
          confirm
        </button>
        <button data-testid="cancel-move" onClick={onCancel}>
          cancel
        </button>
      </div>
    ) : null,
}));

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({
    children,
    onDragStart,
    onDragEnd,
  }: {
    children: React.ReactNode;
    onDragStart: (e: unknown) => void;
    onDragEnd: (e: unknown) => void;
  }) => {
    // Expunem handlerii pe window pentru a-i putea apela din teste
    (window as unknown as Record<string, unknown>).__dndOnDragStart =
      onDragStart;
    (window as unknown as Record<string, unknown>).__dndOnDragEnd = onDragEnd;
    return (
      <div
        data-testid="dnd-context"
        data-drag-start={String(!!onDragStart)}
        data-drag-end={String(!!onDragEnd)}
      >
        {children}
      </div>
    );
  },
  DragOverlay: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="drag-overlay">{children}</div>
  ),
  PointerSensor: class {},
  TouchSensor: class {},
  useSensor: vi.fn(),
  useSensors: vi.fn().mockReturnValue([]),
}));

// ─── Date de test ──────────────────────────────────────────

const today = new Date();
const todayYMD = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

const sampleOrder: Order = {
  id: "ord-1",
  clientName: "Acme SRL",
  origin: "Bucuresti",
  destination: "Cluj",
  date: "2025-06-01",
  status: "in_transit",
};

const sampleDriver: Driver = {
  id: "drv-1",
  name: "Ion Popescu",
  phone: "0700000000",
  licenseExpiry: "2026-01-01",
  status: "on_trip",
};

const sampleTruck: Truck = {
  id: "trk-1",
  plateNumber: "B-123-ABC",
  brand: "Volvo",
  model: "FH",
  year: 2020,
  mileage: 100000,
  status: "on_trip",
  itpExpiry: "2026-01-01",
  rcaExpiry: "2026-01-01",
  vignetteExpiry: "2026-01-01",
};

const sampleTrip: Trip = {
  id: "trip-1",
  orderId: "ord-1",
  driverId: "drv-1",
  truckId: "trk-1",
  departureDate: todayYMD,
  estimatedArrivalDate: todayYMD,
  kmLoaded: 300,
  kmEmpty: 50,
  fuelCost: 450,
  status: "planned",
};

const unscheduledTrip: Trip = {
  id: "trip-unscheduled",
  orderId: "ord-1",
  driverId: "drv-1",
  truckId: "trk-1",
  departureDate: "",
  estimatedArrivalDate: "",
  kmLoaded: 100,
  kmEmpty: 20,
  fuelCost: 200,
  status: "planned",
};

function setupMocks(
  trips: Trip[] = [],
  orders: Order[] = [],
  drivers: Driver[] = [],
  trucks: Truck[] = [],
) {
  mockGetCollection.mockImplementation((key: string) => {
    if (key === "transmarin_trips") return trips;
    if (key === "transmarin_orders") return orders;
    if (key === "transmarin_drivers") return drivers;
    if (key === "transmarin_trucks") return trucks;
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

const monthNames = [
  "Ian",
  "Feb",
  "Mar",
  "Apr",
  "Mai",
  "Iun",
  "Iul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// ─── Render initial ────────────────────────────────────────
describe("TripsCalendarDnd — render initial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDesktop();
    setupMocks();
  });

  afterEach(() => setDesktop());

  it("afiseaza titlul paginii", () => {
    render(<TripsCalendarDndPage />);
    expect(screen.getByText("trips.title")).toBeTruthy();
  });

  it("afiseaza butonul Today", () => {
    render(<TripsCalendarDndPage />);
    expect(screen.getByText("tripsDnd.today")).toBeTruthy();
  });

  it("afiseaza luna si anul curent", () => {
    render(<TripsCalendarDndPage />);
    const year = today.getFullYear().toString();
    expect(screen.getByText(new RegExp(year))).toBeTruthy();
  });

  it("afiseaza numele zilelor saptamanii", () => {
    render(<TripsCalendarDndPage />);
    expect(screen.getByText("Luni")).toBeTruthy();
    expect(screen.getByText("Duminica")).toBeTruthy();
  });

  it("afiseaza sidebar-ul cu curse neprogramate gol", () => {
    render(<TripsCalendarDndPage />);
    expect(screen.getByText("tripsDnd.sidebar.empty")).toBeTruthy();
  });

  it("afiseaza ziua de azi in calendar", () => {
    render(<TripsCalendarDndPage />);
    const todayEl = screen.getByTestId(`day-${todayYMD}`);
    expect(todayEl.getAttribute("data-today")).toBe("true");
  });

  it("afiseaza toate cele 4 statusuri in legenda", () => {
    render(<TripsCalendarDndPage />);
    expect(screen.getByText("trips.status.planned")).toBeTruthy();
    expect(screen.getByText("trips.status.in_desfasurare")).toBeTruthy();
    expect(screen.getByText("trips.status.finalizata")).toBeTruthy();
    expect(screen.getByText("trips.status.anulata")).toBeTruthy();
  });
});

// ─── useData — incarca curse ───────────────────────────────
describe("TripsCalendarDnd — useData incarca curse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDesktop();
  });

  afterEach(() => setDesktop());

  it("afiseaza cursa pe ziua de departure", async () => {
    setupMocks([sampleTrip], [sampleOrder], [sampleDriver], [sampleTruck]);
    render(<TripsCalendarDndPage />);

    await waitFor(() => {
      expect(
        screen.getByTestId(`trip-${sampleTrip.id}-on-${todayYMD}`),
      ).toBeTruthy();
    });
  });

  it("afiseaza cursa imbogatita cu clientName", async () => {
    setupMocks([sampleTrip], [sampleOrder], [sampleDriver], [sampleTruck]);
    render(<TripsCalendarDndPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme SRL")).toBeTruthy();
    });
  });

  it("afiseaza cursele neprogramate in sidebar", async () => {
    setupMocks([unscheduledTrip], [sampleOrder], [sampleDriver], [sampleTruck]);
    render(<TripsCalendarDndPage />);

    await waitFor(() => {
      const cards = screen.getAllByTestId("sidebar-trip-trip-unscheduled");
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  it("nu afiseaza cursele finalizate in sidebar", async () => {
    const finishedTrip: Trip = {
      ...unscheduledTrip,
      id: "trip-finished",
      status: "finalizata",
    };
    setupMocks([finishedTrip], [sampleOrder], [sampleDriver], [sampleTruck]);
    render(<TripsCalendarDndPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("sidebar-trip-trip-finished")).toBeNull();
    });
  });

  it("nu afiseaza cursele anulate in sidebar", async () => {
    const cancelledTrip: Trip = {
      ...unscheduledTrip,
      id: "trip-cancelled",
      status: "anulata",
    };
    setupMocks([cancelledTrip], [sampleOrder], [sampleDriver], [sampleTruck]);
    render(<TripsCalendarDndPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("sidebar-trip-trip-cancelled")).toBeNull();
    });
  });
});

// ─── Navigare luna ─────────────────────────────────────────
describe("TripsCalendarDnd — navigare luna", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDesktop();
    setupMocks();
  });

  afterEach(() => setDesktop());

  it("butonul prev schimba luna inapoi", async () => {
    render(<TripsCalendarDndPage />);
    const prevMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
    const prevYear =
      today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
    const monthYearRegex = new RegExp(
      `${monthNames[prevMonth]}\\s+${prevYear}`,
    );

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      expect(screen.getByText(monthYearRegex)).toBeTruthy();
    });
  });

  it("butonul next schimba luna inainte", async () => {
    render(<TripsCalendarDndPage />);
    const nextMonth = today.getMonth() === 11 ? 0 : today.getMonth() + 1;
    const nextYear =
      today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();
    const monthYearRegex = new RegExp(
      `${monthNames[nextMonth]}\\s+${nextYear}`,
    );

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]);

    await waitFor(() => {
      expect(screen.getByText(monthYearRegex)).toBeTruthy();
    });
  });

  it("butonul Today reseteaza la luna curenta", async () => {
    render(<TripsCalendarDndPage />);
    const currentMonth = monthNames[today.getMonth()];
    const currentYear = today.getFullYear();
    const monthYearRegex = new RegExp(`${currentMonth}\\s+${currentYear}`);

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);
    fireEvent.click(screen.getByText("tripsDnd.today"));

    await waitFor(() => {
      expect(screen.getByText(monthYearRegex)).toBeTruthy();
    });
  });
});

// ─── TripDetailDialog ──────────────────────────────────────
describe("TripsCalendarDnd — TripDetailDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDesktop();
    setupMocks([sampleTrip], [sampleOrder], [sampleDriver], [sampleTruck]);
  });

  afterEach(() => setDesktop());

  it("deschide dialogul la click pe cursa din calendar", async () => {
    render(<TripsCalendarDndPage />);

    await waitFor(() =>
      screen.getByTestId(`trip-${sampleTrip.id}-on-${todayYMD}`),
    );
    fireEvent.click(screen.getByTestId(`trip-${sampleTrip.id}-on-${todayYMD}`));

    await waitFor(() => {
      expect(screen.getByTestId("trip-detail-dialog")).toBeTruthy();
      expect(screen.getByTestId("detail-trip-id").textContent).toBe("trip-1");
    });
  });

  it("inchide dialogul la close", async () => {
    render(<TripsCalendarDndPage />);

    await waitFor(() =>
      screen.getByTestId(`trip-${sampleTrip.id}-on-${todayYMD}`),
    );
    fireEvent.click(screen.getByTestId(`trip-${sampleTrip.id}-on-${todayYMD}`));

    await waitFor(() => screen.getByTestId("close-detail"));
    fireEvent.click(screen.getByTestId("close-detail"));

    await waitFor(() => {
      expect(screen.queryByTestId("trip-detail-dialog")).toBeNull();
    });
  });

  it("deschide dialogul la click pe cursa din sidebar", async () => {
    setupMocks([unscheduledTrip], [sampleOrder], [sampleDriver], [sampleTruck]);
    render(<TripsCalendarDndPage />);

    await waitFor(() => {
      const cards = screen.getAllByTestId("sidebar-trip-trip-unscheduled");
      expect(cards.length).toBeGreaterThan(0);
      fireEvent.click(cards[0]);
    });

    await waitFor(() => {
      expect(screen.getByTestId("trip-detail-dialog")).toBeTruthy();
    });
  });
});

// ─── ConfirmMoveDialog ─────────────────────────────────────
describe("TripsCalendarDnd — ConfirmMoveDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDesktop();
    setupMocks([sampleTrip], [sampleOrder], [sampleDriver], [sampleTruck]);
  });

  afterEach(() => setDesktop());

  it("nu afiseaza dialogul de confirmare la render initial", () => {
    render(<TripsCalendarDndPage />);
    expect(screen.queryByTestId("confirm-move-dialog")).toBeNull();
  });

  it("DndContext este randat", () => {
    render(<TripsCalendarDndPage />);
    expect(screen.getByTestId("dnd-context")).toBeTruthy();
  });
});

// ─── Navigare tabs ─────────────────────────────────────────
describe("TripsCalendarDnd — navigare tabs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDesktop();
    setupMocks();
    mockNavigate.mockClear();
  });

  afterEach(() => setDesktop());

  it("click pe tab table navigheaza la /transport/trips", async () => {
    render(<TripsCalendarDndPage />);

    const tabsSelect = screen.getByTestId("tabs-select");
    fireEvent.change(tabsSelect, { target: { value: "table" } });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/transport/trips" });
    });
  });

  it("click pe tab calendar navigheaza la /transport/trips-calendar", async () => {
    render(<TripsCalendarDndPage />);

    const tabsSelect = screen.getByTestId("tabs-select");
    fireEvent.change(tabsSelect, { target: { value: "calendar" } });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/transport/trips-calendar",
      });
    });
  });

  it("click pe tab map navigheaza la /transport/trips-map", async () => {
    render(<TripsCalendarDndPage />);

    const tabsSelect = screen.getByTestId("tabs-select");
    fireEvent.change(tabsSelect, { target: { value: "map" } });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/transport/trips-map" });
    });
  });
});

// ─── Mobile view ───────────────────────────────────────────
describe("TripsCalendarDnd — mobile view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMobile();
  });

  afterEach(() => setDesktop());

  it("afiseaza initiale in loc de nume complete pe mobile", () => {
    setupMocks();
    render(<TripsCalendarDndPage />);
    expect(screen.getByText("L")).toBeTruthy();
  });

  it("afiseaza butonul pentru curse neprogramate pe mobile cand exista", async () => {
    setupMocks([unscheduledTrip], [sampleOrder], [sampleDriver], [sampleTruck]);
    render(<TripsCalendarDndPage />);

    await waitFor(() => {
      const els = screen.getAllByText("tripsDnd.sidebar.title");
      expect(els.length).toBeGreaterThan(0);
    });
  });

  it("toggle buton unscheduled ascunde lista pe mobile", async () => {
    setupMocks([unscheduledTrip], [sampleOrder], [sampleDriver], [sampleTruck]);
    render(<TripsCalendarDndPage />);

    let initialCount = 0;
    await waitFor(() => {
      const cards = screen.getAllByTestId("sidebar-trip-trip-unscheduled");
      expect(cards.length).toBeGreaterThan(0);
      initialCount = cards.length;
    });

    const toggleBtns = screen
      .getAllByText("tripsDnd.sidebar.title")
      .map((el) => el.closest("button"))
      .filter((btn): btn is HTMLButtonElement => btn !== null);

    if (toggleBtns.length > 0) {
      const toggleBtn = toggleBtns[0];

      fireEvent.click(toggleBtn);
      await waitFor(() => {
        const after = screen.queryAllByTestId("sidebar-trip-trip-unscheduled");
        expect(after.length).toBeLessThan(initialCount);
      });

      fireEvent.click(toggleBtn);
      await waitFor(() => {
        const restored = screen.getAllByTestId("sidebar-trip-trip-unscheduled");
        expect(restored.length).toBe(initialCount);
      });
    }
  });
});

// ─── Helper drag & drop ────────────────────────────────────

type DndHandler = (e: unknown) => void;

function simulateDragStart(tripData: unknown) {
  const handler = (window as unknown as Record<string, DndHandler>)
    .__dndOnDragStart;
  handler?.({ active: { data: { current: { trip: tripData } } } });
}

function simulateDragEnd(tripData: unknown, overId: unknown) {
  const handler = (window as unknown as Record<string, DndHandler>)
    .__dndOnDragEnd;
  handler?.({
    active: { data: { current: { trip: tripData } } },
    over: overId != null ? { id: overId } : null,
  });
}

// ─── Drag & Drop ───────────────────────────────────────────
describe("TripsCalendarDnd — drag & drop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDesktop();
    setupMocks([sampleTrip], [sampleOrder], [sampleDriver], [sampleTruck]);
  });

  afterEach(() => setDesktop());

  it("handleDragStart seteaza activeTrip", async () => {
    render(<TripsCalendarDndPage />);
    await waitFor(() =>
      screen.getByTestId(`trip-${sampleTrip.id}-on-${todayYMD}`),
    );

    const enrichedTrip = {
      ...sampleTrip,
      order: sampleOrder,
      driver: sampleDriver,
      truck: sampleTruck,
    };
    simulateDragStart(enrichedTrip);

    await waitFor(() => {
      expect(screen.getByTestId(`trip-card-${sampleTrip.id}`)).toBeTruthy();
    });
  });

  it("handleDragEnd fara over nu deschide confirm dialog", async () => {
    render(<TripsCalendarDndPage />);
    await waitFor(() =>
      screen.getByTestId(`trip-${sampleTrip.id}-on-${todayYMD}`),
    );

    const enrichedTrip = { ...sampleTrip, order: sampleOrder };
    simulateDragStart(enrichedTrip);
    simulateDragEnd(enrichedTrip, null);

    await waitFor(() => {
      expect(screen.queryByTestId("confirm-move-dialog")).toBeNull();
    });
  });

  it("handleDragEnd cu over invalid nu deschide confirm dialog", async () => {
    render(<TripsCalendarDndPage />);
    await waitFor(() =>
      screen.getByTestId(`trip-${sampleTrip.id}-on-${todayYMD}`),
    );

    const enrichedTrip = { ...sampleTrip, order: sampleOrder };
    simulateDragEnd(enrichedTrip, "invalid-date");

    await waitFor(() => {
      expect(screen.queryByTestId("confirm-move-dialog")).toBeNull();
    });
  });

  it("handleDragEnd pe aceeasi zi nu deschide confirm dialog", async () => {
    render(<TripsCalendarDndPage />);
    await waitFor(() =>
      screen.getByTestId(`trip-${sampleTrip.id}-on-${todayYMD}`),
    );

    const enrichedTrip = { ...sampleTrip, order: sampleOrder };
    simulateDragEnd(enrichedTrip, todayYMD);

    await waitFor(() => {
      expect(screen.queryByTestId("confirm-move-dialog")).toBeNull();
    });
  });

  it("handleDragEnd pe alta zi deschide confirm dialog", async () => {
    render(<TripsCalendarDndPage />);
    await waitFor(() =>
      screen.getByTestId(`trip-${sampleTrip.id}-on-${todayYMD}`),
    );

    const enrichedTrip = { ...sampleTrip, order: sampleOrder };
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowYMD = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

    simulateDragEnd(enrichedTrip, tomorrowYMD);

    await waitFor(() => {
      expect(screen.getByTestId("confirm-move-dialog")).toBeTruthy();
      expect(screen.getByTestId("confirm-new-date").textContent).toBe(
        tomorrowYMD,
      );
    });
  });

  it("confirmare mutare apeleaza updateItem si inchide dialogul", async () => {
    render(<TripsCalendarDndPage />);
    await waitFor(() =>
      screen.getByTestId(`trip-${sampleTrip.id}-on-${todayYMD}`),
    );

    const enrichedTrip = { ...sampleTrip, order: sampleOrder };
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowYMD = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

    simulateDragEnd(enrichedTrip, tomorrowYMD);
    await waitFor(() => screen.getByTestId("confirm-move-dialog"));

    fireEvent.click(screen.getByTestId("confirm-move"));

    await waitFor(() => {
      expect(mockUpdateItem).toHaveBeenCalled();
      expect(screen.queryByTestId("confirm-move-dialog")).toBeNull();
    });
  });

  it("anulare mutare inchide dialogul fara updateItem", async () => {
    render(<TripsCalendarDndPage />);
    await waitFor(() =>
      screen.getByTestId(`trip-${sampleTrip.id}-on-${todayYMD}`),
    );

    const enrichedTrip = { ...sampleTrip, order: sampleOrder };
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowYMD = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

    simulateDragEnd(enrichedTrip, tomorrowYMD);
    await waitFor(() => screen.getByTestId("confirm-move-dialog"));

    fireEvent.click(screen.getByTestId("cancel-move"));

    await waitFor(() => {
      expect(screen.queryByTestId("confirm-move-dialog")).toBeNull();
      expect(mockUpdateItem).not.toHaveBeenCalled();
    });
  });

  it("toast success dupa confirmare mutare", async () => {
    const { toast } = await import("sonner");
    render(<TripsCalendarDndPage />);
    await waitFor(() =>
      screen.getByTestId(`trip-${sampleTrip.id}-on-${todayYMD}`),
    );

    const enrichedTrip = { ...sampleTrip, order: sampleOrder };
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowYMD = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

    simulateDragEnd(enrichedTrip, tomorrowYMD);
    await waitFor(() => screen.getByTestId("confirm-move-dialog"));
    fireEvent.click(screen.getByTestId("confirm-move"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("tripsDnd.toast.moved");
    });
  });
});

// ─── Mobile sidebar click ──────────────────────────────────
describe("TripsCalendarDnd — mobile sidebar click deschide detail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMobile();
    setupMocks([unscheduledTrip], [sampleOrder], [sampleDriver], [sampleTruck]);
  });

  afterEach(() => setDesktop());

  it("click pe cursa din mobile sidebar deschide TripDetailDialog", async () => {
    render(<TripsCalendarDndPage />);

    await waitFor(() => {
      const cards = screen.getAllByTestId("sidebar-trip-trip-unscheduled");
      expect(cards.length).toBeGreaterThan(0);
    });

    const cards = screen.getAllByTestId("sidebar-trip-trip-unscheduled");
    fireEvent.click(cards[0]);

    await waitFor(() => {
      expect(screen.getByTestId("trip-detail-dialog")).toBeTruthy();
    });
  });
});
