import { STORAGE_KEYS } from "@/data/mock-data";

const SETTINGS_KEY = STORAGE_KEYS.transport_settings;

export interface TransportSettings {
  alertDaysBeforeExpiry: number;
  plateRegex: string;
  useKm: boolean;
  currency: "RON" | "EUR";
  defaultPageSize: number;
}

export const DEFAULT_TRANSPORT_SETTINGS: TransportSettings = {
  alertDaysBeforeExpiry: 30,
  plateRegex: "^[A-Z]{1,2}\\s?\\d{2,3}\\s?[A-Z]{3}$",
  useKm: true,
  currency: "RON",
  defaultPageSize: 10,
};

export function getTransportSettings(): TransportSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_TRANSPORT_SETTINGS;
    return { ...DEFAULT_TRANSPORT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_TRANSPORT_SETTINGS;
  }
}

export function saveTransportSettings(s: TransportSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}