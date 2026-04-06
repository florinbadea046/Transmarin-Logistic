import { STORAGE_KEYS } from "@/data/mock-data";
import type { HRSettings } from "@/modules/hr/types";

const DEFAULT_HR_SETTINGS: HRSettings = {
  defaultLeaveDays: 21,
  leaveTypes: ["Concediu de odihnă", "Medical", "Fără plată", "Altele"],
  documentAlertDays: 30,
  departments: ["Dispecerat", "Transport", "Service", "Contabilitate", "Administrativ"],
  documentNumberFormat: "DOC-{YYYY}-{NNN}",
  bonusCurrency: "RON",
};

export function getHRSettings(): HRSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.hr_settings);
    if (!raw) return DEFAULT_HR_SETTINGS;
    return { ...DEFAULT_HR_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_HR_SETTINGS;
  }
}
