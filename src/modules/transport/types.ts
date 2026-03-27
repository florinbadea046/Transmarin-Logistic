export interface Order {
  id: string;
  clientName: string;
  origin: string;
  destination: string;
  date: string;
  status: "pending" | "assigned" | "in_transit" | "delivered" | "cancelled";
  weight?: number;
  notes?: string;
}

export interface Trip {
  id: string;
  orderId: string;
  driverId: string;
  truckId: string;
  departureDate: string;
  estimatedArrivalDate: string;
  kmLoaded: number;
  kmEmpty: number;
  fuelCost: number;
  revenue?: number;
  status: "planned" | "in_desfasurare" | "finalizata" | "anulata";
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseExpiry: string;
  status: "available" | "on_trip" | "off_duty";
  truckId?: string;
  employeeId?: string;
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

export type MaintenanceType =
  | "revizie"
  | "schimb_ulei"
  | "anvelope"
  | "frane"
  | "altele";

export type MaintenanceStatus =
  | "programat"
  | "in_lucru"
  | "finalizat";

export interface MaintenanceRecord {
  id: string;
  truckId: string;
  type: MaintenanceType;
  description: string;
  entryDate: string;
  exitDate?: string;
  cost: number;
  mechanic: string;
  status: MaintenanceStatus;
  notes?: string;
}

export interface FuelLog {
  id: string;
  truckId: string;
  driverId: string;
  date: string;           
  station: string;
  liters: number;
  pricePerLiter: number;
  totalCost: number;     
  kmAtFueling: number;    
}