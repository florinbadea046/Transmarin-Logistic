// ──────────────────────────────────────────────────────────
// Tipuri de date pentru modulul Parc Auto & Service
// ──────────────────────────────────────────────────────────

export interface Part {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  supplier: string;
  minStock: number;
}

export interface ServiceRecord {
  id: string;
  truckId: string;
  date: string;
  type: "revision" | "repair" | "itp" | "other";
  description: string;
  cost: number;
  partsUsed: { partId: string; quantity: number }[];
  mileageAtService: number;
  nextServiceDate?: string;
}

export interface FuelRecord {
  id: string;
  truckId: string;
  date: string;
  liters: number;
  cost: number;
  mileage: number;
}
