import { describe, it, expect, beforeEach } from "vitest";
import {
  DEFAULT_TRANSPORT_SETTINGS,
  getTransportSettings,
  saveTransportSettings,
} from "@/utils/transport-settings";
import { STORAGE_KEYS } from "@/data/mock-data";

describe("getTransportSettings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns DEFAULT_TRANSPORT_SETTINGS when nothing stored", () => {
    expect(getTransportSettings()).toEqual(DEFAULT_TRANSPORT_SETTINGS);
  });

  it("merges stored values onto defaults (partial override)", () => {
    localStorage.setItem(
      STORAGE_KEYS.transport_settings,
      JSON.stringify({ alertDaysBeforeExpiry: 60 }),
    );
    const settings = getTransportSettings();
    expect(settings.alertDaysBeforeExpiry).toBe(60);
    expect(settings.useKm).toBe(true);
    expect(settings.currency).toBe("RON");
  });

  it("returns defaults when JSON is malformed", () => {
    localStorage.setItem(STORAGE_KEYS.transport_settings, "not-json");
    expect(getTransportSettings()).toEqual(DEFAULT_TRANSPORT_SETTINGS);
  });
});

describe("saveTransportSettings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists settings to localStorage", () => {
    saveTransportSettings({ ...DEFAULT_TRANSPORT_SETTINGS, currency: "EUR" });
    const raw = localStorage.getItem(STORAGE_KEYS.transport_settings)!;
    expect(JSON.parse(raw).currency).toBe("EUR");
  });

  it("save then get round-trips", () => {
    const custom = { ...DEFAULT_TRANSPORT_SETTINGS, defaultPageSize: 50, useKm: false };
    saveTransportSettings(custom);
    expect(getTransportSettings()).toEqual(custom);
  });
});

describe("DEFAULT_TRANSPORT_SETTINGS", () => {
  it("has expected defaults", () => {
    expect(DEFAULT_TRANSPORT_SETTINGS.alertDaysBeforeExpiry).toBe(30);
    expect(DEFAULT_TRANSPORT_SETTINGS.currency).toBe("RON");
    expect(DEFAULT_TRANSPORT_SETTINGS.useKm).toBe(true);
    expect(DEFAULT_TRANSPORT_SETTINGS.defaultPageSize).toBe(10);
  });
});
