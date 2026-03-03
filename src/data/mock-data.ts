// ──────────────────────────────────────────────────────────
// Date mock inițiale — se încarcă la prima rulare dacă
// localStorage e gol. Studenții pot adăuga mai multe date.
// ──────────────────────────────────────────────────────────

import { initCollection } from "@/utils/local-storage";
import type { Driver, Truck, Order } from "@/modules/transport/types";
import type { Part } from "@/modules/fleet/types";
import type { Employee } from "@/modules/hr/types";
import type { Supplier } from "@/modules/accounting/types";

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
  initCollection(STORAGE_KEYS.serviceRecords, []);
  initCollection(STORAGE_KEYS.fuelRecords, []);
  initCollection(STORAGE_KEYS.invoices, []);
  initCollection(STORAGE_KEYS.leaveRequests, []);
  initCollection(STORAGE_KEYS.bonuses, []);
}
