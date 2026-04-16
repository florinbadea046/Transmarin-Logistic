import { describe, it, expect } from "vitest";
import {
  getStatusConfig,
  isExpired,
  isExpiringSoon,
  getDateStatus,
} from "@/modules/fleet/utils/truckUtils";

const t = (k: string) => k;

describe("getStatusConfig", () => {
  it("returns config for all 3 truck statuses", () => {
    const cfg = getStatusConfig(t);
    expect(Object.keys(cfg)).toEqual(["available", "on_trip", "in_service"]);
  });

  it("uses i18n labels", () => {
    const cfg = getStatusConfig(t);
    expect(cfg.available.label).toBe("fleet.trucks.statusAvailable");
  });

  it("in_service variant is destructive (visual signal)", () => {
    const cfg = getStatusConfig(t);
    expect(cfg.in_service.variant).toBe("destructive");
  });
});

describe("isExpired", () => {
  it("returns true for past date", () => {
    expect(isExpired("2020-01-01")).toBe(true);
  });

  it("returns false for far-future date", () => {
    expect(isExpired("2099-12-31")).toBe(false);
  });
});

describe("isExpiringSoon", () => {
  it("returns true within default 30 days window", () => {
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    expect(isExpiringSoon(future.toISOString())).toBe(true);
  });

  it("returns false beyond window", () => {
    const future = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    expect(isExpiringSoon(future.toISOString())).toBe(false);
  });

  it("returns false for already expired dates", () => {
    expect(isExpiringSoon("2020-01-01")).toBe(false);
  });

  it("respects custom days param", () => {
    const future = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000);
    expect(isExpiringSoon(future.toISOString(), 30)).toBe(false);
    expect(isExpiringSoon(future.toISOString(), 60)).toBe(true);
  });
});

describe("getDateStatus", () => {
  it("returns 'expired' for past dates", () => {
    expect(getDateStatus("2020-01-01")).toBe("expired");
  });

  it("returns 'soon' for near-future dates", () => {
    const soon = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    expect(getDateStatus(soon.toISOString())).toBe("soon");
  });

  it("returns 'valid' for far-future dates", () => {
    expect(getDateStatus("2099-12-31")).toBe("valid");
  });
});
