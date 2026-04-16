import { describe, it, expect, beforeEach } from "vitest";
import {
  ensureClientsSeeded,
  resolveClientName,
  getOrCreateClientId,
} from "@/modules/accounting/utils/clients";
import { STORAGE_KEYS } from "@/data/mock-data";
import {
  getCollection,
  setCollection,
} from "@/utils/local-storage";
import type { Client, Invoice } from "@/modules/accounting/types";
import type { Order } from "@/modules/transport/types";

describe("ensureClientsSeeded", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty when no orders or invoices exist", () => {
    expect(ensureClientsSeeded()).toEqual([]);
  });

  it("creates a Client per unique clientName found in Orders", () => {
    const orders: Order[] = [
      { id: "o1", clientName: "Alpha SRL", origin: "A", destination: "B", date: "2026-04-01", status: "pending" },
      { id: "o2", clientName: "Beta SA", origin: "C", destination: "D", date: "2026-04-02", status: "pending" },
    ];
    setCollection(STORAGE_KEYS.orders, orders);
    const clients = ensureClientsSeeded();
    expect(clients).toHaveLength(2);
    expect(clients.map((c) => c.name).sort()).toEqual(["Alpha SRL", "Beta SA"]);
  });

  it("creates a Client per unique clientName found in Invoices", () => {
    const invoices: Invoice[] = [
      { id: "i1", type: "income", number: "F-001", date: "2026-04-01", dueDate: "2026-05-01", clientName: "Gamma SRL", items: [], totalWithoutVAT: 0, vat: 0, total: 0, status: "draft" },
    ];
    setCollection(STORAGE_KEYS.invoices, invoices);
    const clients = ensureClientsSeeded();
    expect(clients).toHaveLength(1);
    expect(clients[0].name).toBe("Gamma SRL");
  });

  it("merges unique names from both orders and invoices, dedupes", () => {
    const orders: Order[] = [
      { id: "o1", clientName: "Alpha SRL", origin: "A", destination: "B", date: "2026-04-01", status: "pending" },
    ];
    const invoices: Invoice[] = [
      { id: "i1", type: "income", number: "F-001", date: "2026-04-01", dueDate: "2026-05-01", clientName: "Alpha SRL", items: [], totalWithoutVAT: 0, vat: 0, total: 0, status: "draft" },
      { id: "i2", type: "income", number: "F-002", date: "2026-04-02", dueDate: "2026-05-02", clientName: "Beta SA", items: [], totalWithoutVAT: 0, vat: 0, total: 0, status: "draft" },
    ];
    setCollection(STORAGE_KEYS.orders, orders);
    setCollection(STORAGE_KEYS.invoices, invoices);
    const clients = ensureClientsSeeded();
    expect(clients).toHaveLength(2);
  });

  it("is idempotent — does not duplicate on subsequent calls", () => {
    const orders: Order[] = [
      { id: "o1", clientName: "Alpha SRL", origin: "A", destination: "B", date: "2026-04-01", status: "pending" },
    ];
    setCollection(STORAGE_KEYS.orders, orders);
    ensureClientsSeeded();
    ensureClientsSeeded();
    ensureClientsSeeded();
    expect(getCollection<Client>(STORAGE_KEYS.clients)).toHaveLength(1);
  });

  it("does not duplicate when Client already exists with same name (case-insensitive)", () => {
    setCollection<Client>(STORAGE_KEYS.clients, [
      { id: "c1", name: "alpha srl" },
    ]);
    const orders: Order[] = [
      { id: "o1", clientName: "Alpha SRL", origin: "A", destination: "B", date: "2026-04-01", status: "pending" },
    ];
    setCollection(STORAGE_KEYS.orders, orders);
    ensureClientsSeeded();
    expect(getCollection<Client>(STORAGE_KEYS.clients)).toHaveLength(1);
  });

  it("trims whitespace from names", () => {
    const orders: Order[] = [
      { id: "o1", clientName: "  Alpha SRL  ", origin: "A", destination: "B", date: "2026-04-01", status: "pending" },
    ];
    setCollection(STORAGE_KEYS.orders, orders);
    const clients = ensureClientsSeeded();
    expect(clients[0].name).toBe("Alpha SRL");
  });

  it("skips empty client names", () => {
    const orders: Order[] = [
      { id: "o1", clientName: "", origin: "A", destination: "B", date: "2026-04-01", status: "pending" },
    ];
    setCollection(STORAGE_KEYS.orders, orders);
    const clients = ensureClientsSeeded();
    expect(clients).toHaveLength(0);
  });

  it("populates createdAt timestamp", () => {
    const orders: Order[] = [
      { id: "o1", clientName: "Alpha SRL", origin: "A", destination: "B", date: "2026-04-01", status: "pending" },
    ];
    setCollection(STORAGE_KEYS.orders, orders);
    const clients = ensureClientsSeeded();
    expect(clients[0].createdAt).toBeDefined();
    expect(new Date(clients[0].createdAt!).toString()).not.toBe("Invalid Date");
  });
});

describe("resolveClientName", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns Client.name when clientId resolves", () => {
    setCollection<Client>(STORAGE_KEYS.clients, [
      { id: "c1", name: "Alpha SRL Renamed" },
    ]);
    expect(resolveClientName({ clientId: "c1", clientName: "Alpha SRL" })).toBe("Alpha SRL Renamed");
  });

  it("falls back to clientName string when clientId is missing", () => {
    expect(resolveClientName({ clientName: "Legacy Name" })).toBe("Legacy Name");
  });

  it("falls back to clientName when clientId points to non-existent Client", () => {
    setCollection<Client>(STORAGE_KEYS.clients, []);
    expect(resolveClientName({ clientId: "missing", clientName: "Fallback" })).toBe("Fallback");
  });

  it("returns empty string when neither is set", () => {
    expect(resolveClientName({})).toBe("");
  });

  it("uses provided clients list (no localStorage hit) when given", () => {
    const localClients: Client[] = [{ id: "c2", name: "From Param" }];
    expect(resolveClientName({ clientId: "c2" }, localClients)).toBe("From Param");
  });
});

describe("getOrCreateClientId", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty string for empty/whitespace name", () => {
    expect(getOrCreateClientId("")).toBe("");
    expect(getOrCreateClientId("   ")).toBe("");
  });

  it("creates a new Client when name not found, returns its id", () => {
    const id = getOrCreateClientId("New Company SRL");
    expect(id).toBeTruthy();
    const clients = getCollection<Client>(STORAGE_KEYS.clients);
    expect(clients).toHaveLength(1);
    expect(clients[0].id).toBe(id);
    expect(clients[0].name).toBe("New Company SRL");
  });

  it("returns existing id when name matches (case-insensitive)", () => {
    setCollection<Client>(STORAGE_KEYS.clients, [
      { id: "existing-id", name: "Acme SRL" },
    ]);
    expect(getOrCreateClientId("acme srl")).toBe("existing-id");
    expect(getOrCreateClientId("ACME SRL")).toBe("existing-id");
    expect(getCollection<Client>(STORAGE_KEYS.clients)).toHaveLength(1);
  });

  it("trims input before matching/creating", () => {
    setCollection<Client>(STORAGE_KEYS.clients, [
      { id: "existing-id", name: "Acme SRL" },
    ]);
    expect(getOrCreateClientId("  acme srl  ")).toBe("existing-id");
  });

  it("created client gets createdAt timestamp", () => {
    const id = getOrCreateClientId("New Company SRL");
    const client = getCollection<Client>(STORAGE_KEYS.clients).find((c) => c.id === id);
    expect(client?.createdAt).toBeDefined();
  });
});
