// ──────────────────────────────────────────────────────────
// Unit tests: Order utility functions
// File: src/modules/transport/pages/_components/order-utils.ts
//
// Ce trebuie testat:
// - getStatusMeta() — returneaza labels + variante corecte pentru fiecare status
// - safeRandomId() — genereaza ID-uri unice, format corect
// - setOrdersToStorage() — salveaza corect in localStorage
// - isDuplicateOrder() — detecteaza duplicate corect, ignora excludeId
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getStatusMeta,
  safeRandomId,
  setOrdersToStorage,
  isDuplicateOrder,
} from "../pages/_components/order-utils";
import type { Order } from "../types";

const t = (k: string) => k;

describe("getStatusMeta", () => {
  it("returneaza toate cele 5 statusuri", () => {
    const meta = getStatusMeta(t);
    expect(Object.keys(meta)).toHaveLength(5);
    expect(meta).toHaveProperty("pending");
    expect(meta).toHaveProperty("assigned");
    expect(meta).toHaveProperty("in_transit");
    expect(meta).toHaveProperty("delivered");
    expect(meta).toHaveProperty("cancelled");
  });

  it("pending are variant secondary", () => {
    const meta = getStatusMeta(t);
    expect(meta.pending.variant).toBe("secondary");
  });

  it("assigned are variant outline", () => {
    const meta = getStatusMeta(t);
    expect(meta.assigned.variant).toBe("outline");
  });

  it("in_transit are variant default", () => {
    const meta = getStatusMeta(t);
    expect(meta.in_transit.variant).toBe("default");
  });

  it("cancelled are variant destructive", () => {
    const meta = getStatusMeta(t);
    expect(meta.cancelled.variant).toBe("destructive");
  });

  it("foloseste functia t() pentru label", () => {
    const customT = (k: string) => `TRANSLATED:${k}`;
    const meta = getStatusMeta(customT);
    expect(meta.pending.label).toBe("TRANSLATED:orders.status.pending");
    expect(meta.cancelled.label).toBe("TRANSLATED:orders.status.cancelled");
  });
});

describe("safeRandomId", () => {
  it("returneaza un string non-gol", () => {
    const id = safeRandomId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("genereaza ID-uri unice la apeluri consecutive", () => {
    const ids = Array.from({ length: 20 }, () => safeRandomId());
    const unique = new Set(ids);
    expect(unique.size).toBe(20);
  });

  it("foloseste fallback cand crypto.randomUUID nu exista", () => {
    const originalUUID = crypto.randomUUID;
    // @ts-expect-error — fortam undefined pentru test
    crypto.randomUUID = undefined;

    const id = safeRandomId();
    expect(id).toMatch(/^order_\d+_[a-f0-9]+$/);

    crypto.randomUUID = originalUUID;
  });
});

describe("setOrdersToStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("salveaza comenzile in localStorage", () => {
    const orders: Order[] = [
      {
        id: "1",
        clientName: "Test SRL",
        origin: "Bucuresti",
        destination: "Cluj",
        date: "2025-01-01",
        status: "pending",
      },
    ];

    setOrdersToStorage(orders);

    const raw = localStorage.getItem("transmarin_orders");
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual(orders);
  });

  it("salveaza array gol fara erori", () => {
    expect(() => setOrdersToStorage([])).not.toThrow();
    const raw = localStorage.getItem("transmarin_orders");
    expect(JSON.parse(raw!)).toEqual([]);
  });

  it("nu arunca eroare daca localStorage esueaza", () => {
    const spy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

    expect(() => setOrdersToStorage([])).not.toThrow();

    spy.mockRestore();
  });
});

describe("isDuplicateOrder", () => {
  const existingOrder: Order = {
    id: "ord-1",
    clientName: "Acme SRL",
    origin: "Bucuresti",
    destination: "Cluj",
    date: "2025-06-01",
    weight: 1500,
    status: "pending",
  };

  const incomingOrder = {
    clientName: "Acme SRL",
    origin: "Bucuresti",
    destination: "Cluj",
    date: "2025-06-01",
    weight: 1500,
  };

  it("detecteaza o comanda duplicat exacta", () => {
    expect(isDuplicateOrder(existingOrder, incomingOrder)).toBe(true);
  });

  it("ignora spatii extra si majuscule", () => {
    expect(
      isDuplicateOrder(existingOrder, {
        ...incomingOrder,
        clientName: "  acme srl  ",
        origin: "BUCURESTI",
      }),
    ).toBe(true);
  });

  it("nu e duplicat daca data difera", () => {
    expect(
      isDuplicateOrder(existingOrder, { ...incomingOrder, date: "2025-07-01" }),
    ).toBe(false);
  });

  it("nu e duplicat daca destinatia difera", () => {
    expect(
      isDuplicateOrder(existingOrder, {
        ...incomingOrder,
        destination: "Timisoara",
      }),
    ).toBe(false);
  });

  it("nu e duplicat daca originea difera", () => {
    expect(
      isDuplicateOrder(existingOrder, { ...incomingOrder, origin: "Iasi" }),
    ).toBe(false);
  });

  it("nu e duplicat daca clientul difera", () => {
    expect(
      isDuplicateOrder(existingOrder, {
        ...incomingOrder,
        clientName: "Alt Client SRL",
      }),
    ).toBe(false);
  });

  it("nu e duplicat daca greutatea difera", () => {
    expect(
      isDuplicateOrder(existingOrder, { ...incomingOrder, weight: 2000 }),
    ).toBe(false);
  });

  it("exclude excludeId — nu se considera duplicat cu sine insusi (la editare)", () => {
    expect(isDuplicateOrder(existingOrder, incomingOrder, "ord-1")).toBe(false);
  });

  it("exclude doar ID-ul specificat, restul raman duplicate", () => {
    const altaComanda: Order = { ...existingOrder, id: "ord-2" };
    expect(isDuplicateOrder(altaComanda, incomingOrder, "ord-1")).toBe(true);
  });

  it("greutate rotunjita la 2 zecimale — 1500.004 e egal cu 1500", () => {
    expect(
      isDuplicateOrder(existingOrder, { ...incomingOrder, weight: 1500.004 }),
    ).toBe(true);
  });

  it("greutate 1500.006 NU e egala cu 1500 (rotunjire diferita)", () => {
    expect(
      isDuplicateOrder(existingOrder, { ...incomingOrder, weight: 1500.006 }),
    ).toBe(false);
  });

  it("gestioneaza valori lipsa (undefined/null) in comanda existenta", () => {
    const orderFaraWeight: Order = { ...existingOrder, weight: undefined };
    // weight undefined se trateaza ca 0, deci 1500 != 0
    expect(isDuplicateOrder(orderFaraWeight, incomingOrder)).toBe(false);
  });
});
