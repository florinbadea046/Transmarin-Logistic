// ──────────────────────────────────────────────────────────
// Date mock inițiale — se încarcă la prima rulare dacă
// localStorage e gol. Studenții pot adăuga mai multe date.
// ──────────────────────────────────────────────────────────

import { initCollection } from "@/utils/local-storage";
import type { Driver, Truck, Order } from "@/modules/transport/types";
import type { Part, ServiceRecord } from "@/modules/fleet/types";
import type { Employee } from "@/modules/hr/types";
import type { Supplier, Invoice } from "@/modules/accounting/types";

// Chei localStorage — toate modulele folosesc aceste chei
export const STORAGE_KEYS = {
  // Transport
  orders: "transmarin_orders",
  trips: "transmarin_trips",
  drivers: "transmarin_drivers",
  trucks: "transmarin_trucks",
  // Fleet
  parts: "transmarin_parts",
  serviceRecords: "transmarin_service_records",
  fuelRecords: "transmarin_fuel_records",
  // Accounting
  invoices: "transmarin_invoices",
  suppliers: "transmarin_suppliers",
  // HR
  employees: "transmarin_employees",
  leaveRequests: "transmarin_leave_requests",
  bonuses: "transmarin_bonuses",
} as const;

// ──────────────────────────────────────────────────────────
// Date seed — minim pentru ca aplicația să aibă conținut
// ──────────────────────────────────────────────────────────

const seedDrivers: Driver[] = [
  {
    id: "d1",
    name: "Gheorghe Marin",
    phone: "0721000001",
    licenseExpiry: "2027-03-15",
    status: "available",
  },
  {
    id: "d2",
    name: "Vasile Popa",
    phone: "0721000002",
    licenseExpiry: "2026-11-20",
    status: "available",
  },
  {
    id: "d3",
    name: "Andrei Stoica",
    phone: "0721000003",
    licenseExpiry: "2026-06-10",
    status: "on_trip",
  },
];

const seedTrucks: Truck[] = [
  {
    id: "t1",
    plateNumber: "CT-01-TML",
    brand: "Volvo",
    model: "FH16",
    year: 2021,
    mileage: 320000,
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
  {
    id: "t3",
    plateNumber: "CT-03-TML",
    brand: "Mercedes",
    model: "Actros",
    year: 2022,
    mileage: 180000,
    status: "in_service",
    itpExpiry: "2027-02-28",
    rcaExpiry: "2027-03-01",
    vignetteExpiry: "2026-12-31",
  },
];

// ✅ ORDERS — listă mai mare pentru test paginare (10/20/50) + filtre
const seedOrders: Order[] = [
  {
    id: "o1",
    clientName: "SC Logistica SRL",
    origin: "Constanța",
    destination: "București",
    date: "2026-02-20",
    status: "delivered",
    weight: 18,
  },
  {
    id: "o2",
    clientName: "Trans Europa SA",
    origin: "Timișoara",
    destination: "Constanța",
    date: "2026-02-21",
    status: "in_transit",
    weight: 22,
  },
  {
    id: "o3",
    clientName: "Cargo Plus SRL",
    origin: "Cluj-Napoca",
    destination: "Brăila",
    date: "2026-02-22",
    status: "pending",
    weight: 15,
  },

  // --- Extra orders (pentru paginare/filtre) ---
  {
    id: "o4",
    clientName: "Danube Freight SRL",
    origin: "Galați",
    destination: "Iași",
    date: "2026-02-23",
    status: "assigned",
    weight: 12,
  },
  {
    id: "o5",
    clientName: "BlueRoad Logistics",
    origin: "Brașov",
    destination: "Sibiu",
    date: "2026-02-24",
    status: "pending",
    weight: 9,
  },
  {
    id: "o6",
    clientName: "Carpathia Transport",
    origin: "Sibiu",
    destination: "Brașov",
    date: "2026-02-25",
    status: "in_transit",
    weight: 14,
  },
  {
    id: "o7",
    clientName: "Atlas Cargo SA",
    origin: "București",
    destination: "Ploiești",
    date: "2026-02-26",
    status: "delivered",
    weight: 7,
  },
  {
    id: "o8",
    clientName: "PortLine SRL",
    origin: "Constanța",
    destination: "Craiova",
    date: "2026-02-27",
    status: "assigned",
    weight: 20,
  },
  {
    id: "o9",
    clientName: "EuroHaul SRL",
    origin: "Craiova",
    destination: "Timișoara",
    date: "2026-02-28",
    status: "in_transit",
    weight: 16,
  },
  {
    id: "o10",
    clientName: "Nordic Routes",
    origin: "Oradea",
    destination: "Cluj-Napoca",
    date: "2026-03-01",
    status: "pending",
    weight: 10,
  },

  {
    id: "o11",
    clientName: "FastTrack SRL",
    origin: "Arad",
    destination: "Deva",
    date: "2026-03-02",
    status: "delivered",
    weight: 6,
  },
  {
    id: "o12",
    clientName: "Balkan Cargo SA",
    origin: "Deva",
    destination: "București",
    date: "2026-03-03",
    status: "cancelled",
    weight: 11,
  },
  {
    id: "o13",
    clientName: "TransMarin Partners",
    origin: "Pitești",
    destination: "Constanța",
    date: "2026-03-04",
    status: "assigned",
    weight: 13,
  },
  {
    id: "o14",
    clientName: "GreenWay Logistics",
    origin: "Buzău",
    destination: "Galați",
    date: "2026-03-05",
    status: "pending",
    weight: 8,
  },
  {
    id: "o15",
    clientName: "Delta Freight",
    origin: "Tulcea",
    destination: "Constanța",
    date: "2026-03-06",
    status: "in_transit",
    weight: 17,
  },
  {
    id: "o16",
    clientName: "SteelMove SRL",
    origin: "Hunedoara",
    destination: "Târgu Mureș",
    date: "2026-03-07",
    status: "assigned",
    weight: 24,
  },
  {
    id: "o17",
    clientName: "CityLink Transport",
    origin: "Târgu Mureș",
    destination: "Cluj-Napoca",
    date: "2026-03-08",
    status: "delivered",
    weight: 5,
  },
  {
    id: "o18",
    clientName: "OceanBridge SRL",
    origin: "Constanța",
    destination: "București",
    date: "2026-03-09",
    status: "in_transit",
    weight: 19,
  },
  {
    id: "o19",
    clientName: "Rapid Haulage",
    origin: "București",
    destination: "Brașov",
    date: "2026-03-10",
    status: "pending",
    weight: 9,
  },
  {
    id: "o20",
    clientName: "WestLine Cargo",
    origin: "Timișoara",
    destination: "Oradea",
    date: "2026-03-11",
    status: "assigned",
    weight: 15,
  },

  {
    id: "o21",
    clientName: "Central Freight",
    origin: "Cluj-Napoca",
    destination: "Satu Mare",
    date: "2026-03-12",
    status: "delivered",
    weight: 12,
  },
  {
    id: "o22",
    clientName: "IronRoute SA",
    origin: "Reșița",
    destination: "Arad",
    date: "2026-03-13",
    status: "cancelled",
    weight: 10,
  },
  {
    id: "o23",
    clientName: "Skyline Logistics",
    origin: "Iași",
    destination: "Bacău",
    date: "2026-03-14",
    status: "pending",
    weight: 7,
  },
  {
    id: "o24",
    clientName: "RoadRunner SRL",
    origin: "Bacău",
    destination: "Botoșani",
    date: "2026-03-15",
    status: "in_transit",
    weight: 11,
  },
  {
    id: "o25",
    clientName: "CargoHub SRL",
    origin: "Botoșani",
    destination: "Suceava",
    date: "2026-03-16",
    status: "assigned",
    weight: 14,
  },
  {
    id: "o26",
    clientName: "TransValea",
    origin: "Suceava",
    destination: "Iași",
    date: "2026-03-17",
    status: "delivered",
    weight: 6,
  },
  {
    id: "o27",
    clientName: "HarborLine",
    origin: "Constanța",
    destination: "Galați",
    date: "2026-03-18",
    status: "pending",
    weight: 21,
  },
  {
    id: "o28",
    clientName: "Mountain Freight",
    origin: "Brașov",
    destination: "București",
    date: "2026-03-19",
    status: "in_transit",
    weight: 13,
  },
  {
    id: "o29",
    clientName: "EastWest Cargo",
    origin: "București",
    destination: "Iași",
    date: "2026-03-20",
    status: "assigned",
    weight: 16,
  },
  {
    id: "o30",
    clientName: "Danube Express",
    origin: "Galați",
    destination: "Brăila",
    date: "2026-03-21",
    status: "delivered",
    weight: 4,
  },
];

const seedParts: Part[] = [
  {
    id: "p1",
    name: "Filtru ulei",
    category: "Filtre",
    quantity: 25,
    unitPrice: 45,
    supplier: "Auto Parts SRL",
    minStock: 10,
  },
  {
    id: "p2",
    name: "Plăcuțe frână",
    category: "Frâne",
    quantity: 8,
    unitPrice: 320,
    supplier: "Brake Systems SA",
    minStock: 4,
  },
  {
    id: "p3",
    name: "Curea distribuție",
    category: "Motor",
    quantity: 3,
    unitPrice: 580,
    supplier: "Auto Parts SRL",
    minStock: 2,
  },
];

const seedEmployees: Employee[] = [
  {
    id: "e1",
    name: "Gheorghe Marin",
    position: "Șofer",
    department: "Transport",
    phone: "0721000001",
    email: "gheorghe@transmarin.ro",
    hireDate: "2019-03-01",
    salary: 5500,
    documents: [],
  },
  {
    id: "e2",
    name: "Vasile Popa",
    position: "Șofer",
    department: "Transport",
    phone: "0721000002",
    email: "vasile@transmarin.ro",
    hireDate: "2020-07-15",
    salary: 5200,
    documents: [],
  },
  {
    id: "e3",
    name: "Ana Radu",
    position: "Dispecer",
    department: "Operațiuni",
    phone: "0722000001",
    email: "ana@transmarin.ro",
    hireDate: "2021-01-10",
    salary: 4800,
    documents: [],
  },
];

const seedSuppliers: Supplier[] = [
  {
    id: "s1",
    name: "Auto Parts SRL",
    cui: "RO12345678",
    address: "Str. Industriilor 10, Constanța",
    phone: "0241500100",
    email: "contact@autoparts.ro",
    bankAccount: "RO49AAAA1B31007593840000",
  },
  {
    id: "s2",
    name: "Brake Systems SA",
    cui: "RO87654321",
    address: "Bd. Muncii 25, București",
    phone: "0212000200",
    email: "office@brakesystems.ro",
    bankAccount: "RO49BBBB1B31007593840000",
  },
];
const seedServiceRecords: ServiceRecord[] = [
  {
    id: "sr1",
    truckId: "t1",
    date: "2026-02-15",
    type: "revision",
    description: "Schimb ulei motor + filtru ulei + filtru aer",
    cost: 485,
    partsUsed: [{ partId: "p1", quantity: 2 }],
    mileageAtService: 315000,
    nextServiceDate: "2026-08-15",
  },
  {
    id: "sr2",
    truckId: "t2",
    date: "2026-01-10",
    type: "repair",
    description: "Înlocuire plăcuțe frână față + spate",
    cost: 640,
    partsUsed: [{ partId: "p2", quantity: 2 }],
    mileageAtService: 405000,
    nextServiceDate: "2026-07-10",
  },
  {
    id: "sr3",
    truckId: "t3",
    date: "2026-03-01",
    type: "itp",
    description: "Inspecție tehnică periodică + curea distribuție",
    cost: 580,
    partsUsed: [{ partId: "p3", quantity: 1 }],
    mileageAtService: 178000,
    nextServiceDate: "2027-03-01",
  },
];

// ──────────────────────────────────────────────────────────
// Helper: generează dată ISO relativă la azi
// ex: relativeDate(0, 5)  → ziua 5 a lunii curente
//     relativeDate(-1, 15) → ziua 15 a lunii trecute
// ──────────────────────────────────────────────────────────
function relativeDate(monthOffset: number, day: number): string {
  const d = new Date();
  d.setDate(1); // evităm overflow de lună
  d.setMonth(d.getMonth() + monthOffset);
  d.setDate(day);
  return d.toISOString().slice(0, 10);
}

const seedInvoices: Invoice[] = [
  // Luna curentă — venit
  {
    id: "inv1",
    type: "income",
    number: "F-001",
    date: relativeDate(0, 5),
    dueDate: relativeDate(0, 20),
    clientName: "SC Logistica SRL",
    items: [{ description: "Transport marfă", quantity: 1, unitPrice: 5000, total: 5000 }],
    totalWithoutVAT: 5000,
    vat: 950,
    total: 5950,
    status: "paid",
  },
  // Luna curentă — cheltuială
  {
    id: "inv2",
    type: "expense",
    number: "F-002",
    date: relativeDate(0, 10),
    dueDate: relativeDate(0, 25),
    supplierId: "s1",
    clientName: "Auto Parts SRL",
    items: [{ description: "Piese auto", quantity: 3, unitPrice: 800, total: 2400 }],
    totalWithoutVAT: 2400,
    vat: 456,
    total: 2856,
    status: "sent",
  },
  // Luna trecută — venit overdue
  {
    id: "inv3",
    type: "income",
    number: "F-003",
    date: relativeDate(-1, 15),
    dueDate: relativeDate(-1, 28),
    clientName: "Trans Europa SA",
    items: [{ description: "Transport internațional", quantity: 1, unitPrice: 8000, total: 8000 }],
    totalWithoutVAT: 8000,
    vat: 1520,
    total: 9520,
    status: "overdue",
  },
  // Luna trecută — cheltuială
  {
    id: "inv4",
    type: "expense",
    number: "F-004",
    date: relativeDate(-1, 10),
    dueDate: relativeDate(-1, 25),
    supplierId: "s2",
    clientName: "Brake Systems SA",
    items: [{ description: "Plăcuțe frână", quantity: 4, unitPrice: 320, total: 1280 }],
    totalWithoutVAT: 1280,
    vat: 243,
    total: 1523,
    status: "paid",
  },
  // Acum 2 luni — venit
  {
    id: "inv5",
    type: "income",
    number: "F-005",
    date: relativeDate(-2, 8),
    dueDate: relativeDate(-2, 22),
    clientName: "Cargo Plus SRL",
    items: [{ description: "Transport intern", quantity: 2, unitPrice: 3000, total: 6000 }],
    totalWithoutVAT: 6000,
    vat: 1140,
    total: 7140,
    status: "paid",
  },
  // Acum 2 luni — cheltuială
  {
    id: "inv6",
    type: "expense",
    number: "F-006",
    date: relativeDate(-2, 20),
    dueDate: relativeDate(-1, 5),
    supplierId: "s1",
    clientName: "Auto Parts SRL",
    items: [{ description: "Filtre ulei", quantity: 10, unitPrice: 45, total: 450 }],
    totalWithoutVAT: 450,
    vat: 85,
    total: 535,
    status: "paid",
  },
  // Acum 3 luni — venit
  {
    id: "inv7",
    type: "income",
    number: "F-007",
    date: relativeDate(-3, 12),
    dueDate: relativeDate(-3, 26),
    clientName: "SC Logistica SRL",
    items: [{ description: "Transport marfă frigorifică", quantity: 1, unitPrice: 7000, total: 7000 }],
    totalWithoutVAT: 7000,
    vat: 1330,
    total: 8330,
    status: "paid",
  },
  // Acum 4 luni — venit
  {
    id: "inv8",
    type: "income",
    number: "F-008",
    date: relativeDate(-4, 3),
    dueDate: relativeDate(-4, 18),
    clientName: "Trans Europa SA",
    items: [{ description: "Transport extern", quantity: 1, unitPrice: 12000, total: 12000 }],
    totalWithoutVAT: 12000,
    vat: 2280,
    total: 14280,
    status: "paid",
  },
  // Acum 5 luni — venit
  {
    id: "inv9",
    type: "income",
    number: "F-009",
    date: relativeDate(-5, 7),
    dueDate: relativeDate(-5, 21),
    clientName: "Cargo Plus SRL",
    items: [{ description: "Transport ADR", quantity: 1, unitPrice: 9000, total: 9000 }],
    totalWithoutVAT: 9000,
    vat: 1710,
    total: 10710,
    status: "paid",
  },
  // Acum 5 luni — cheltuială
  {
    id: "inv10",
    type: "expense",
    number: "F-010",
    date: relativeDate(-5, 15),
    dueDate: relativeDate(-4, 1),
    supplierId: "s2",
    clientName: "Brake Systems SA",
    items: [{ description: "Service periodic", quantity: 1, unitPrice: 2500, total: 2500 }],
    totalWithoutVAT: 2500,
    vat: 475,
    total: 2975,
    status: "paid",
  },
];

/**
 * Încarcă datele seed în localStorage (doar dacă cheile nu există deja).
 * Apelat o singură dată la inițializarea aplicației.
 */
export function seedMockData(): void {
  initCollection(STORAGE_KEYS.drivers, seedDrivers);
  initCollection(STORAGE_KEYS.trucks, seedTrucks);
  initCollection(STORAGE_KEYS.orders, seedOrders);
  initCollection(STORAGE_KEYS.parts, seedParts);
  initCollection(STORAGE_KEYS.employees, seedEmployees);
  initCollection(STORAGE_KEYS.suppliers, seedSuppliers);
  initCollection(STORAGE_KEYS.trips, []);
  initCollection(STORAGE_KEYS.serviceRecords, seedServiceRecords);
  initCollection(STORAGE_KEYS.fuelRecords, []);
  initCollection(STORAGE_KEYS.invoices, seedInvoices);
  initCollection(STORAGE_KEYS.leaveRequests, []);
  initCollection(STORAGE_KEYS.bonuses, []);
}
