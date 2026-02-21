// ──────────────────────────────────────────────────────────
// Tipuri de date pentru modulul Transport & Dispecerat
// Studenții vor extinde aceste tipuri pe măsură ce dezvoltă modulul.
// ──────────────────────────────────────────────────────────

export interface Order {
  id: string;
  clientName: string;
  origin: string;
  destination: string;
  date: string;
  status: "pending" | "assigned" | "in_transit" | "delivered" | "cancelled";
  weight?: number; // tone
  notes?: string;
}

export interface Trip {
  id: string;
  orderId: string;
  driverId: string;
  truckId: string;
  date: string;
  kmLoaded: number;
  kmEmpty: number;
  fuelCost: number;
  status: "planned" | "active" | "completed";
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseExpiry: string;
  status: "available" | "on_trip" | "off_duty";
}

export interface Truck {
  id: string;
  plateNumber: string;
  brand: string;
  model: string;
  year: number;
  mileage: number;
  status: "available" | "on_trip" | "in_service";
  itpExpiry: string;
  rcaExpiry: string;
  vignetteExpiry: string;
}
