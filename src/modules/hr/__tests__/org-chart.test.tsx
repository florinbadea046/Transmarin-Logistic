// @vitest-environment jsdom
// ──────────────────────────────────────────────────────────
// Component tests: OrgChart
// File: src/modules/hr/pages/_components/org-chart.tsx
// ──────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

import OrgChart from "@/modules/hr/pages/_components/org-chart";
import { STORAGE_KEYS } from "@/data/mock-data";
import { setCollection } from "@/utils/local-storage";
import type { Employee } from "@/modules/hr/types";

const employees: Employee[] = [
  { id: "e1", name: "CEO Smith", position: "CEO", department: "Administrativ", phone: "0721000001", email: "ceo@x", hireDate: "2020-01-01", salary: 20000, documents: [] },
  { id: "e2", name: "Manager Pop", position: "Manager Transport", department: "Transport", phone: "0721000002", email: "mgr@x", hireDate: "2021-01-01", salary: 12000, managerId: "e1", documents: [] },
  { id: "e3", name: "Sofer Andrei", position: "Sofer", department: "Transport", phone: "0721000003", email: "sofer@x", hireDate: "2022-01-01", salary: 5000, managerId: "e2", documents: [] },
];

describe("OrgChart", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders without crashing", () => {
    setCollection(STORAGE_KEYS.employees, employees);
    expect(() => render(<OrgChart />)).not.toThrow();
  });

  it("renders root employee (no managerId)", () => {
    setCollection(STORAGE_KEYS.employees, employees);
    render(<OrgChart />);
    expect(screen.getByText("CEO Smith")).toBeInTheDocument();
  });

  it("expanding a node reveals direct subordinates", async () => {
    const user = userEvent.setup();
    setCollection(STORAGE_KEYS.employees, employees);
    render(<OrgChart />);

    const expandButtons = screen.getAllByRole("button");
    await user.click(expandButtons[0]);

    expect(screen.getByText("Manager Pop")).toBeInTheDocument();
  });

  it("renders a search input", () => {
    setCollection(STORAGE_KEYS.employees, employees);
    render(<OrgChart />);
    const searchInput = document.querySelector("input");
    expect(searchInput).toBeTruthy();
  });

  it("filters employees when typing in search", async () => {
    const user = userEvent.setup();
    setCollection(STORAGE_KEYS.employees, employees);
    render(<OrgChart />);
    const searchInput = document.querySelector("input")!;
    await user.type(searchInput, "Andrei");
    expect(screen.getByText(/Sofer Andrei/)).toBeInTheDocument();
  });

  it("does not render employees from empty storage", () => {
    setCollection<Employee>(STORAGE_KEYS.employees, []);
    const { container } = render(<OrgChart />);
    expect(container.textContent).not.toContain("CEO Smith");
  });
});
