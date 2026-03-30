import type { Truck } from "@/modules/transport/types";

// ── Tipuri formular ────────────────────────────────────────

export interface TruckFormData {
  plateNumber: string; brand: string; model: string; year: string; mileage: string;
  status: Truck["status"]; itpExpiry: string; rcaExpiry: string; vignetteExpiry: string;
}
export interface TruckFormErrors {
  plateNumber?: string; brand?: string; model?: string; year?: string; mileage?: string;
  itpExpiry?: string; rcaExpiry?: string; vignetteExpiry?: string;
}
export const EMPTY_FORM: TruckFormData = {
  plateNumber: "", brand: "", model: "", year: "", mileage: "",
  status: "available", itpExpiry: "", rcaExpiry: "", vignetteExpiry: "",
};
