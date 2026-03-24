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
  status: "În așteptare" | "Atribuit" | "În tranzit" | "Livrat" | "Anulat";
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
  status: "Planificat" | "Activ" | "Finalizat";
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseExpiry: string;
  status: "Disponibil" | "În cursă" | "Indisponibil";
}

export interface Truck {
  id: string;
  plateNumber: string;
  brand: string;
  model: string;
  year: number;
  mileage: number;
  status: "Disponibil" | "În cursă" | "În cursă";
  itpExpiry: string;
  rcaExpiry: string;
  vignetteExpiry: string;
}
