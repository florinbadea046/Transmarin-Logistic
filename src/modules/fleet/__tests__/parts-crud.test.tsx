// @vitest-environment jsdom
// ──────────────────────────────────────────────────────────
// Component tests: PartsCRUD (smoke + storage rendering)
// File: src/modules/fleet/components/PartsCRUD.tsx
// Pure CRUD logic covered separately in partsUtils.test.ts
// ──────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/hooks/use-audit-log", () => ({
  useAuditLog: () => ({ log: vi.fn() }),
}));

vi.mock("@/modules/fleet/utils/exportExcel", () => ({
  exportPartsToExcel: vi.fn(),
}));

vi.mock("@/modules/fleet/components/AllocatePart", () => ({
  AllocatePart: () => null,
}));

import { PartsCRUD } from "@/modules/fleet/components/PartsCRUD";
import { STORAGE_KEYS } from "@/data/mock-data";
import { setCollection } from "@/utils/local-storage";
import type { Part } from "@/modules/fleet/types";

const parts: Part[] = [
  { id: "p1", name: "Filter Bosch", category: "engine", code: "FB-001", quantity: 10, unitPrice: 50, supplier: "Bosch", minStock: 5 },
  { id: "p2", name: "Tire Michelin", category: "body", code: "TM-001", quantity: 2, unitPrice: 200, supplier: "Michelin", minStock: 4 },
  { id: "p3", name: "Battery Varta", category: "electrical", code: "VB-001", quantity: 0, unitPrice: 400, supplier: "Varta", minStock: 2 },
];

describe("PartsCRUD", () => {
  beforeEach(() => {
    localStorage.clear();
    setCollection(STORAGE_KEYS.parts, parts);
  });

  it("renders without crashing", () => {
    expect(() => render(<PartsCRUD />)).not.toThrow();
  });

  it("renders all parts from storage", () => {
    render(<PartsCRUD />);
    expect(screen.getByText("Filter Bosch")).toBeInTheDocument();
    expect(screen.getByText("Tire Michelin")).toBeInTheDocument();
    expect(screen.getByText("Battery Varta")).toBeInTheDocument();
  });

  it("renders supplier column for each part", () => {
    render(<PartsCRUD />);
    expect(screen.getByText("Bosch")).toBeInTheDocument();
    expect(screen.getByText("Michelin")).toBeInTheDocument();
  });

  it("handles empty parts list gracefully", () => {
    setCollection<Part>(STORAGE_KEYS.parts, []);
    render(<PartsCRUD />);
    expect(screen.queryByText("Filter Bosch")).not.toBeInTheDocument();
  });
});
