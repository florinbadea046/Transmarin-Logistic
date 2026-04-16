// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string, opts?: { count?: number }) => (opts?.count !== undefined ? `${k}_${opts.count}` : k) }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/layout/header", () => ({
  Header: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/layout/main", () => ({
  Main: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import * as React from "react";

import ClientsPage from "@/modules/accounting/pages/clients";
import { STORAGE_KEYS } from "@/data/mock-data";
import { setCollection, getCollection } from "@/utils/local-storage";
import type { Client } from "@/modules/accounting/types";
import type { Order } from "@/modules/transport/types";

describe("ClientsPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders empty state when no clients exist", () => {
    render(<ClientsPage />);
    expect(screen.getByText(/clients.empty/i)).toBeInTheDocument();
  });

  it("renders subtitle with clients count", () => {
    setCollection<Client>(STORAGE_KEYS.clients, [
      { id: "c1", name: "Alpha SRL" },
      { id: "c2", name: "Beta SA" },
    ]);
    render(<ClientsPage />);
    expect(screen.getByText(/clients.subtitle_2/i)).toBeInTheDocument();
  });

  it("auto-seeds clients from existing orders", () => {
    setCollection<Order>(STORAGE_KEYS.orders, [
      { id: "o1", clientName: "Auto Seeded SRL", origin: "A", destination: "B", date: "2026-04-01", status: "pending" },
    ]);
    render(<ClientsPage />);
    expect(screen.getByText("Auto Seeded SRL")).toBeInTheDocument();
  });

  it("filters by search term (name)", async () => {
    const user = userEvent.setup();
    setCollection<Client>(STORAGE_KEYS.clients, [
      { id: "c1", name: "Alpha SRL" },
      { id: "c2", name: "Beta SA" },
    ]);
    render(<ClientsPage />);
    const search = screen.getByPlaceholderText(/clients.searchPlaceholder/i);
    await user.type(search, "alpha");
    expect(screen.getByText("Alpha SRL")).toBeInTheDocument();
    expect(screen.queryByText("Beta SA")).not.toBeInTheDocument();
  });

  it("opens new-client dialog and creates a client", async () => {
    const user = userEvent.setup();
    render(<ClientsPage />);
    await user.click(screen.getByRole("button", { name: /clients.actions.new/i }));

    const nameInput = screen.getByLabelText(/clients.fields.name \*/i);
    await user.type(nameInput, "Created Inline SRL");
    await user.click(screen.getByRole("button", { name: /clients.actions.save/i }));

    expect(screen.getByText("Created Inline SRL")).toBeInTheDocument();
    const stored = getCollection<Client>(STORAGE_KEYS.clients);
    expect(stored.some((c) => c.name === "Created Inline SRL")).toBe(true);
  });

  it("rejects empty client name and shows error toast", async () => {
    const { toast } = await import("sonner");
    const user = userEvent.setup();
    render(<ClientsPage />);
    await user.click(screen.getByRole("button", { name: /clients.actions.new/i }));
    await user.click(screen.getByRole("button", { name: /clients.actions.save/i }));
    expect(toast.error).toHaveBeenCalledWith("clients.validation.nameRequired");
  });

  it("edits existing client", async () => {
    const user = userEvent.setup();
    setCollection<Client>(STORAGE_KEYS.clients, [
      { id: "c1", name: "Old Name" },
    ]);
    render(<ClientsPage />);

    const row = screen.getByText("Old Name").closest("tr")!;
    const buttons = within(row).getAllByRole("button");
    await user.click(buttons[0]);

    const nameInput = screen.getByLabelText(/clients.fields.name \*/i) as HTMLInputElement;
    await user.clear(nameInput);
    await user.type(nameInput, "New Name");
    await user.click(screen.getByRole("button", { name: /clients.actions.save/i }));

    expect(screen.getByText("New Name")).toBeInTheDocument();
    expect(screen.queryByText("Old Name")).not.toBeInTheDocument();
  });

  it("deletes client after confirmation", async () => {
    const user = userEvent.setup();
    setCollection<Client>(STORAGE_KEYS.clients, [
      { id: "c1", name: "To Delete" },
    ]);
    render(<ClientsPage />);

    const row = screen.getByText("To Delete").closest("tr")!;
    const buttons = within(row).getAllByRole("button");
    await user.click(buttons[1]);
    await user.click(screen.getByRole("button", { name: /clients.actions.confirmDelete/i }));

    expect(screen.queryByText("To Delete")).not.toBeInTheDocument();
    expect(getCollection<Client>(STORAGE_KEYS.clients)).toHaveLength(0);
  });
});
