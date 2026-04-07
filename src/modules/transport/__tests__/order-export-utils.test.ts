// ──────────────────────────────────────────────────────────
// Unit tests: Order export functions (PDF, Excel, CSV)
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Order, Trip } from "@/modules/transport/types";

// ── jsPDF mock ─────────────────────────────────────────────

const mockSave = vi.fn();
const mockText = vi.fn();
const mockSetFontSize = vi.fn();
const mockAutoTable = vi.fn();

vi.mock("jspdf", () => {
  const JsPDF = vi.fn(function (this: Record<string, unknown>) {
    this.setFontSize = mockSetFontSize;
    this.text = mockText;
    this.save = mockSave;
  });
  return { default: JsPDF };
});

vi.mock("jspdf-autotable", () => ({
  default: mockAutoTable,
}));

// ── XLSX mock ──────────────────────────────────────────────

const mockJsonToSheet = vi.fn(() => ({}));
const mockBookNew = vi.fn(() => ({}));
const mockBookAppendSheet = vi.fn();
const mockWriteFile = vi.fn();

vi.mock("xlsx", () => ({
  utils: {
    json_to_sheet: mockJsonToSheet,
    book_new: mockBookNew,
    book_append_sheet: mockBookAppendSheet,
  },
  writeFile: mockWriteFile,
}));

// ── PapaParse mock ─────────────────────────────────────────

const mockUnparse = vi.fn(() => "col1,col2\nval1,val2");

vi.mock("papaparse", () => ({
  default: { unparse: mockUnparse },
}));

// ── Helpers ────────────────────────────────────────────────

const t = (k: string) => k;

const mockOrders: Order[] = [
  {
    id: "o1",
    clientName: "SC Test SRL",
    origin: "Constanta",
    destination: "Bucuresti",
    date: "2026-03-01",
    status: "delivered",
    weight: 10,
    notes: "Test nota",
  },
  {
    id: "o2",
    clientName: "Trans SA",
    origin: "Cluj-Napoca",
    destination: "Iasi",
    date: "2026-03-10",
    status: "pending",
    weight: 5,
  },
];

const mockTrips: Trip[] = [
  {
    id: "tr1",
    orderId: "o1",
    driverId: "d1",
    truckId: "t1",
    departureDate: "2026-03-01",
    estimatedArrivalDate: "2026-03-02",
    kmLoaded: 200,
    kmEmpty: 30,
    fuelCost: 500,
    status: "finalizata",
  },
];

// ── Import dupa mock-uri ───────────────────────────────────

const {
  exportOrdersPDF,
  exportOrdersExcel,
  exportOrdersCSV,
  exportTripsPDF,
  exportTripsExcel,
  exportTripsCSV,
} = await import(
  "@/modules/transport/pages/_components/order-export-utils"
);

// ── toRows ─────────────────────────────────────────────────

describe("toRows (via exportOrdersExcel)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("transforma comenzile in randuri cu cheile corecte din t()", () => {
    exportOrdersExcel(mockOrders, t);
    expect(mockJsonToSheet).toHaveBeenCalledOnce();
     
    const rows = (mockJsonToSheet.mock.calls as any)[0][0];
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveProperty("orders.fields.client", "SC Test SRL");
    expect(rows[0]).toHaveProperty("orders.fields.origin", "Constanta");
    expect(rows[0]).toHaveProperty("orders.fields.destination", "Bucuresti");
    expect(rows[0]).toHaveProperty("orders.fields.status", "delivered");
  });

  it("campurile lipsa devin string gol", () => {
    const orderFaraNote: Order[] = [{ ...mockOrders[0], notes: undefined }];
    exportOrdersExcel(orderFaraNote, t);
     
    const rows = (mockJsonToSheet.mock.calls as any)[0][0];
    expect(rows[0]["orders.fields.notes"]).toBe("");
  });
});

// ── getExportOrderCols ─────────────────────────────────────

describe("getExportOrderCols (via exportOrdersPDF)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("genereaza 7 coloane pentru comenzi", () => {
    exportOrdersPDF(mockOrders, t);
    expect(mockAutoTable).toHaveBeenCalledOnce();
     
    const args = (mockAutoTable.mock.calls as any)[0][1];
    expect(args.head[0]).toHaveLength(7);
  });

  it("prima coloana este orders.fields.client", () => {
    exportOrdersPDF(mockOrders, t);
     
    const args = (mockAutoTable.mock.calls as any)[0][1];
    expect(args.head[0][0]).toBe("orders.fields.client");
  });
});

// ── getExportTripCols ──────────────────────────────────────

describe("getExportTripCols (via exportTripsPDF)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("genereaza 9 coloane pentru curse", () => {
    exportTripsPDF(mockTrips, t);
     
    const args = (mockAutoTable.mock.calls as any)[0][1];
    expect(args.head[0]).toHaveLength(9);
  });

  it("prima coloana este ID", () => {
    exportTripsPDF(mockTrips, t);
     
    const args = (mockAutoTable.mock.calls as any)[0][1];
    expect(args.head[0][0]).toBe("ID");
  });
});

// ── exportOrdersPDF ────────────────────────────────────────

describe("exportOrdersPDF", () => {
  beforeEach(() => vi.clearAllMocks());

  it("apeleaza doc.save cu 'comenzi.pdf'", () => {
    exportOrdersPDF(mockOrders, t);
    expect(mockSave).toHaveBeenCalledWith("comenzi.pdf");
  });

  it("apeleaza autoTable cu head si body corecte", () => {
    exportOrdersPDF(mockOrders, t);
     
    const args = (mockAutoTable.mock.calls as any)[0][1];
    expect(args.head).toHaveLength(1);
    expect(args.body).toHaveLength(2);
  });

  it("apeleaza setFontSize si text", () => {
    exportOrdersPDF(mockOrders, t);
    expect(mockSetFontSize).toHaveBeenCalledWith(14);
    expect(mockText).toHaveBeenCalled();
  });

  it("functioneaza cu lista goala de comenzi", () => {
    exportOrdersPDF([], t);
     
    const args = (mockAutoTable.mock.calls as any)[0][1];
    expect(args.body).toHaveLength(0);
    expect(mockSave).toHaveBeenCalledWith("comenzi.pdf");
  });
});

// ── exportOrdersExcel ──────────────────────────────────────

describe("exportOrdersExcel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("apeleaza XLSX.writeFile cu 'comenzi.xlsx'", () => {
    exportOrdersExcel(mockOrders, t);
    expect(mockWriteFile).toHaveBeenCalledWith(expect.anything(), "comenzi.xlsx");
  });

  it("apeleaza book_append_sheet cu numele foii = t('orders.title')", () => {
    exportOrdersExcel(mockOrders, t);
    expect(mockBookAppendSheet).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "orders.title",
    );
  });

  it("apeleaza json_to_sheet cu numarul corect de randuri", () => {
    exportOrdersExcel(mockOrders, t);
     
    const rows = (mockJsonToSheet.mock.calls as any)[0][0];
    expect(rows).toHaveLength(2);
  });
});

// ── exportOrdersCSV ────────────────────────────────────────

describe("exportOrdersCSV", () => {
  beforeEach(() => vi.clearAllMocks());

  it("apeleaza Papa.unparse", () => {
    exportOrdersCSV(mockOrders, t);
    expect(mockUnparse).toHaveBeenCalledOnce();
  });

  it("apeleaza URL.createObjectURL", () => {
    const spy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
    exportOrdersCSV(mockOrders, t);
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it("apeleaza URL.revokeObjectURL dupa click", () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    exportOrdersCSV(mockOrders, t);
    expect(revokeSpy).toHaveBeenCalledWith("blob:mock");
    revokeSpy.mockRestore();
  });

  it("apeleaza click pe elementul <a>", () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const mockClick = vi.fn();
    const mockA = { href: "", download: "", click: mockClick };
    vi.spyOn(document, "createElement").mockReturnValueOnce(mockA as unknown as HTMLElement);
    exportOrdersCSV(mockOrders, t);
    expect(mockClick).toHaveBeenCalledOnce();
  });

  it("download attribute este 'comenzi.csv'", () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const mockA = { href: "", download: "", click: vi.fn() };
    vi.spyOn(document, "createElement").mockReturnValueOnce(mockA as unknown as HTMLElement);
    exportOrdersCSV(mockOrders, t);
    expect(mockA.download).toBe("comenzi.csv");
  });
});

// ── exportTripsPDF ─────────────────────────────────────────

describe("exportTripsPDF", () => {
  beforeEach(() => vi.clearAllMocks());

  it("apeleaza doc.save cu 'curse.pdf'", () => {
    exportTripsPDF(mockTrips, t);
    expect(mockSave).toHaveBeenCalledWith("curse.pdf");
  });

  it("body contine datele curse", () => {
    exportTripsPDF(mockTrips, t);
     
    const args = (mockAutoTable.mock.calls as any)[0][1];
    expect(args.body).toHaveLength(1);
    expect(args.body[0]).toContain("tr1");
  });
});

// ── exportTripsExcel ───────────────────────────────────────

describe("exportTripsExcel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("apeleaza XLSX.writeFile cu 'curse.xlsx'", () => {
    exportTripsExcel(mockTrips, t);
    expect(mockWriteFile).toHaveBeenCalledWith(expect.anything(), "curse.xlsx");
  });

  it("foaia se numeste trips.title", () => {
    exportTripsExcel(mockTrips, t);
    expect(mockBookAppendSheet).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "trips.title",
    );
  });
});

// ── exportTripsCSV ─────────────────────────────────────────

describe("exportTripsCSV", () => {
  beforeEach(() => vi.clearAllMocks());

  it("apeleaza Papa.unparse", () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    exportTripsCSV(mockTrips, t);
    expect(mockUnparse).toHaveBeenCalledOnce();
  });

  it("apeleaza click pe elementul <a>", () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const mockClick = vi.fn();
    const mockA = { href: "", download: "", click: mockClick };
    vi.spyOn(document, "createElement").mockReturnValueOnce(mockA as unknown as HTMLElement);
    exportTripsCSV(mockTrips, t);
    expect(mockClick).toHaveBeenCalledOnce();
  });

  it("download attribute este 'curse.csv'", () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const mockA = { href: "", download: "", click: vi.fn() };
    vi.spyOn(document, "createElement").mockReturnValueOnce(mockA as unknown as HTMLElement);
    exportTripsCSV(mockTrips, t);
    expect(mockA.download).toBe("curse.csv");
  });
});