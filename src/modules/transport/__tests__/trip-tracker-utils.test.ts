// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";

vi.mock("leaflet", () => ({
  default: {
    divIcon: vi.fn((opts: object) => ({ ...opts, _icon: true })),
  },
}));

vi.mock("react-leaflet", () => ({
  useMap: () => ({ panTo: vi.fn() }),
}));

import {
  CITY_COORDS,
  getCoords,
  haversineKm,
  interpolateAlongRoute,
  traveledSegments,
  makeTruckIcon,
  makeEndpointIcon,
  makeStopIcon,
} from "@/modules/transport/pages/_components/trip-tracker-utils";

describe("getCoords", () => {
  it("returns exact coords for known city", () => {
    expect(getCoords("București")).toEqual(CITY_COORDS["București"]);
    expect(getCoords("Bucharest")).toEqual(CITY_COORDS["Bucharest"]);
  });

  it("returns coords without diacritics", () => {
    expect(getCoords("Bucuresti")).toBeDefined();
    expect(getCoords("Cluj-Napoca")).toEqual([46.7712, 23.6236]);
  });

  it("returns null for unknown city", () => {
    expect(getCoords("Atlantis")).toBeNull();
  });

  it("matches partial city names containing known city", () => {
    expect(getCoords("Sat lângă București")).toEqual(CITY_COORDS["București"]);
  });

  it("trims input", () => {
    expect(getCoords("   Sibiu   ")).toEqual([45.7983, 24.1256]);
  });
});

describe("haversineKm", () => {
  it("returns 0 for identical points", () => {
    expect(haversineKm([44.4268, 26.1025], [44.4268, 26.1025])).toBe(0);
  });

  it("computes Bucharest-Cluj distance ~325 km (real)", () => {
    const d = haversineKm(
      CITY_COORDS["București"],
      CITY_COORDS["Cluj-Napoca"],
    );
    expect(d).toBeGreaterThan(300);
    expect(d).toBeLessThan(360);
  });

  it("is symmetric (a→b == b→a)", () => {
    const a: [number, number] = [44, 26];
    const b: [number, number] = [46, 23];
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 6);
  });
});

describe("interpolateAlongRoute", () => {
  const wp: [number, number][] = [
    [0, 0],
    [0, 10],
    [10, 10],
  ];

  it("returns null for fewer than 2 waypoints", () => {
    expect(interpolateAlongRoute([], 0.5)).toBeNull();
    expect(interpolateAlongRoute([[0, 0]], 0.5)).toBeNull();
  });

  it("returns first waypoint at progress <= 0", () => {
    expect(interpolateAlongRoute(wp, 0)).toEqual([0, 0]);
    expect(interpolateAlongRoute(wp, -0.5)).toEqual([0, 0]);
  });

  it("returns last waypoint at progress >= 1", () => {
    expect(interpolateAlongRoute(wp, 1)).toEqual([10, 10]);
    expect(interpolateAlongRoute(wp, 1.5)).toEqual([10, 10]);
  });

  it("returns intermediate point at midpoint", () => {
    const mid = interpolateAlongRoute(wp, 0.5);
    expect(mid).not.toBeNull();
    expect(mid![0]).toBeGreaterThanOrEqual(0);
    expect(mid![1]).toBeGreaterThan(0);
  });

  it("handles zero-length route by returning first waypoint", () => {
    const sameWp: [number, number][] = [[0, 0], [0, 0]];
    expect(interpolateAlongRoute(sameWp, 0.5)).toEqual([0, 0]);
  });
});

describe("traveledSegments", () => {
  const wp: [number, number][] = [
    [0, 0],
    [0, 10],
    [10, 10],
  ];

  it("returns empty for progress 0 or fewer than 2 waypoints", () => {
    expect(traveledSegments(wp, 0, [0, 0])).toEqual([]);
    expect(traveledSegments([[0, 0]], 0.5, [0, 0])).toEqual([]);
  });

  it("includes first waypoint and current position when in transit", () => {
    const result = traveledSegments(wp, 0.3, [0, 3]);
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0]).toEqual([0, 0]);
  });

  it("returns empty for zero-length route", () => {
    expect(traveledSegments([[0, 0], [0, 0]], 0.5, [0, 0])).toEqual([]);
  });
});

describe("Leaflet icon factories", () => {
  it("makeTruckIcon returns a divIcon with html", () => {
    const icon = makeTruckIcon() as { html?: string; iconSize?: number[] };
    expect(icon.html).toContain("<div");
    expect(icon.iconSize).toEqual([18, 18]);
  });

  it("makeEndpointIcon embeds the given color", () => {
    const icon = makeEndpointIcon("#ff0000") as { html?: string };
    expect(icon.html).toContain("#ff0000");
  });

  it("makeStopIcon shows the stop number and reached state changes color", () => {
    const reached = makeStopIcon(2, true) as { html?: string };
    const unreached = makeStopIcon(3, false) as { html?: string };
    expect(reached.html).toContain(">2<");
    expect(unreached.html).toContain(">3<");
    expect(reached.html).toContain("#22c55e");
    expect(unreached.html).toContain("#94a3b8");
  });
});
