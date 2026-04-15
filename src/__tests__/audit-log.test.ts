// ──────────────────────────────────────────────────────────
// Unit tests: Audit Log hook
// File: src/modules/transport/__tests__/use-audit-log.test.ts
// ──────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAuditLog, loadAuditLog } from "@/hooks/use-audit-log";
import type { AuditEntry } from "@/hooks/use-audit-log";

vi.mock("@/data/mock-data", () => ({
  STORAGE_KEYS: { auditLog: "auditLog" },
}));

const KEY = "auditLog";

beforeEach(() => {
  localStorage.clear();
});

// ── loadAuditLog ───────────────────────────────────────────

describe("loadAuditLog", () => {
  it("returneaza array gol cand nu exista date", () => {
    expect(loadAuditLog()).toEqual([]);
  });

  it("returneaza intrarile salvate", () => {
    const entries: AuditEntry[] = [
      {
        id: "a1", timestamp: "2026-01-01T10:00:00.000Z",
        action: "create", entity: "driver",
        entityId: "d1", entityLabel: "Ion Popescu",
      },
    ];
    localStorage.setItem(KEY, JSON.stringify(entries));
    expect(loadAuditLog()).toEqual(entries);
  });

  it("returneaza array gol pentru JSON invalid", () => {
    localStorage.setItem(KEY, "{ invalid }}}");
    expect(loadAuditLog()).toEqual([]);
  });

  it("returneaza mai multe intrari in ordinea salvata", () => {
    const entries: AuditEntry[] = [
      { id: "a1", timestamp: "2026-01-02T00:00:00.000Z", action: "create", entity: "driver", entityId: "d1", entityLabel: "Ion" },
      { id: "a2", timestamp: "2026-01-01T00:00:00.000Z", action: "delete", entity: "truck", entityId: "t1", entityLabel: "CT-01" },
    ];
    localStorage.setItem(KEY, JSON.stringify(entries));
    const result = loadAuditLog();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("a1");
    expect(result[1].id).toBe("a2");
  });

  it("nu arunca eroare pentru localStorage gol", () => {
    expect(() => loadAuditLog()).not.toThrow();
  });
});

// ── useAuditLog — log() ────────────────────────────────────

describe("useAuditLog — log()", () => {
  it("salveaza o intrare noua in localStorage", () => {
    const { log } = useAuditLog();
    log({ action: "create", entity: "driver", entityId: "d1", entityLabel: "Ion Popescu" });
    expect(loadAuditLog()).toHaveLength(1);
  });

  it("intrarea salvata contine campurile trimise", () => {
    const { log } = useAuditLog();
    log({
      action: "update",
      entity: "truck",
      entityId: "t1",
      entityLabel: "CT-01-TML",
      detailKey: "activityLog.details.truckUpdated",
    });
    const entries = loadAuditLog();
    expect(entries[0].action).toBe("update");
    expect(entries[0].entity).toBe("truck");
    expect(entries[0].entityId).toBe("t1");
    expect(entries[0].entityLabel).toBe("CT-01-TML");
    expect(entries[0].detailKey).toBe("activityLog.details.truckUpdated");
  });

  it("genereaza un id unic pentru fiecare intrare", () => {
    const { log } = useAuditLog();
    log({ action: "create", entity: "driver", entityId: "d1", entityLabel: "A" });
    log({ action: "create", entity: "driver", entityId: "d2", entityLabel: "B" });
    const entries = loadAuditLog();
    expect(entries[0].id).not.toBe(entries[1].id);
  });

  it("id-ul incepe cu 'audit-'", () => {
    const { log } = useAuditLog();
    log({ action: "create", entity: "driver", entityId: "d1", entityLabel: "Ion" });
    expect(loadAuditLog()[0].id).toMatch(/^audit-/);
  });

  it("genereaza un timestamp ISO valid", () => {
    const before = new Date().toISOString();
    const { log } = useAuditLog();
    log({ action: "create", entity: "driver", entityId: "d1", entityLabel: "Ion" });
    const after = new Date().toISOString();
    const ts = loadAuditLog()[0].timestamp;
    expect(ts >= before).toBe(true);
    expect(ts <= after).toBe(true);
  });

  it("noua intrare e la inceputul array-ului (cele mai recente primele)", () => {
    const { log } = useAuditLog();
    log({ action: "create", entity: "driver", entityId: "d1", entityLabel: "Prima" });
    log({ action: "update", entity: "driver", entityId: "d1", entityLabel: "A doua" });
    log({ action: "delete", entity: "driver", entityId: "d1", entityLabel: "A treia" });
    const entries = loadAuditLog();
    expect(entries[0].entityLabel).toBe("A treia");
    expect(entries[1].entityLabel).toBe("A doua");
    expect(entries[2].entityLabel).toBe("Prima");
  });

  it("pastreaza intrarile existente dupa adaugare", () => {
    const { log } = useAuditLog();
    log({ action: "create", entity: "driver", entityId: "d1", entityLabel: "Ion" });
    log({ action: "create", entity: "truck", entityId: "t1", entityLabel: "CT-01" });
    expect(loadAuditLog()).toHaveLength(2);
  });

  it("salveaza corect oldValue si newValue", () => {
    const { log } = useAuditLog();
    log({
      action: "update",
      entity: "driver",
      entityId: "d1",
      entityLabel: "Ion",
      oldValue: { status: "available" },
      newValue: { status: "on_trip" },
    });
    const entry = loadAuditLog()[0];
    expect(entry.oldValue).toEqual({ status: "available" });
    expect(entry.newValue).toEqual({ status: "on_trip" });
  });

  it("salveaza detailParams corect", () => {
    const { log } = useAuditLog();
    log({
      action: "create",
      entity: "trip",
      entityId: "tr1",
      entityLabel: "CT-01",
      detailParams: { truck: "CT-01-TML", driver: "Ion" },
    });
    expect(loadAuditLog()[0].detailParams).toEqual({ truck: "CT-01-TML", driver: "Ion" });
  });
});

// ── Trimming la 500 intrari ────────────────────────────────

describe("useAuditLog — trimming 500 intrari", () => {
  it("pastreaza maxim 500 intrari", () => {
    // Preincarcam 499 intrari in localStorage
    const existing: AuditEntry[] = Array.from({ length: 499 }, (_, i) => ({
      id: `a${i}`,
      timestamp: new Date().toISOString(),
      action: "create" as const,
      entity: "driver" as const,
      entityId: `d${i}`,
      entityLabel: `Driver ${i}`,
    }));
    localStorage.setItem(KEY, JSON.stringify(existing));

    const { log } = useAuditLog();
    log({ action: "create", entity: "truck", entityId: "t1", entityLabel: "CT-01" });
    expect(loadAuditLog()).toHaveLength(500);
  });

  it("nu depaseste 500 intrari dupa adaugare la 500 existente", () => {
    const existing: AuditEntry[] = Array.from({ length: 500 }, (_, i) => ({
      id: `a${i}`,
      timestamp: new Date().toISOString(),
      action: "create" as const,
      entity: "driver" as const,
      entityId: `d${i}`,
      entityLabel: `Driver ${i}`,
    }));
    localStorage.setItem(KEY, JSON.stringify(existing));

    const { log } = useAuditLog();
    log({ action: "delete", entity: "truck", entityId: "t1", entityLabel: "CT-01" });
    expect(loadAuditLog()).toHaveLength(500);
  });

  it("noua intrare e prima dupa trimming", () => {
    const existing: AuditEntry[] = Array.from({ length: 500 }, (_, i) => ({
      id: `a${i}`,
      timestamp: new Date().toISOString(),
      action: "create" as const,
      entity: "driver" as const,
      entityId: `d${i}`,
      entityLabel: `Old ${i}`,
    }));
    localStorage.setItem(KEY, JSON.stringify(existing));

    const { log } = useAuditLog();
    log({ action: "update", entity: "truck", entityId: "t1", entityLabel: "Noua Intrare" });
    expect(loadAuditLog()[0].entityLabel).toBe("Noua Intrare");
  });

  it("intrarile vechi sunt eliminate (ultima e taiata)", () => {
    const existing: AuditEntry[] = Array.from({ length: 500 }, (_, i) => ({
      id: `a${i}`,
      timestamp: new Date().toISOString(),
      action: "create" as const,
      entity: "driver" as const,
      entityId: `d${i}`,
      entityLabel: `Old ${i}`,
    }));
    localStorage.setItem(KEY, JSON.stringify(existing));

    const { log } = useAuditLog();
    log({ action: "create", entity: "order", entityId: "o1", entityLabel: "Nou" });

    const entries = loadAuditLog();
    // Ultima intrare (a499) trebuie eliminata
    expect(entries.find((e) => e.id === "a499")).toBeUndefined();
  });
});

// ── Integrare ──────────────────────────────────────────────

describe("useAuditLog — integrare", () => {
  it("dupa 3 apeluri log(), loadAuditLog() returneaza 3 intrari", () => {
    const { log } = useAuditLog();
    log({ action: "create", entity: "driver", entityId: "d1", entityLabel: "Ion" });
    log({ action: "update", entity: "truck", entityId: "t1", entityLabel: "CT-01" });
    log({ action: "delete", entity: "order", entityId: "o1", entityLabel: "Comanda 1" });
    expect(loadAuditLog()).toHaveLength(3);
  });

  it("doua instante ale hook-ului partajeaza acelasi storage", () => {
    const { log: log1 } = useAuditLog();
    const { log: log2 } = useAuditLog();
    log1({ action: "create", entity: "driver", entityId: "d1", entityLabel: "Ion" });
    log2({ action: "create", entity: "truck", entityId: "t1", entityLabel: "CT-01" });
    expect(loadAuditLog()).toHaveLength(2);
  });

  it("toate tipurile de action sunt salvate corect", () => {
    const { log } = useAuditLog();
    log({ action: "create", entity: "driver", entityId: "d1", entityLabel: "A" });
    log({ action: "update", entity: "driver", entityId: "d1", entityLabel: "B" });
    log({ action: "delete", entity: "driver", entityId: "d1", entityLabel: "C" });
    const entries = loadAuditLog();
    expect(entries.map((e) => e.action)).toContain("create");
    expect(entries.map((e) => e.action)).toContain("update");
    expect(entries.map((e) => e.action)).toContain("delete");
  });

  it("toate tipurile de entity sunt salvate corect", () => {
    const { log } = useAuditLog();
    const entities = ["driver", "truck", "order", "trip", "maintenance", "fuelLog"] as const;
    entities.forEach((entity, i) => {
      log({ action: "create", entity, entityId: `id${i}`, entityLabel: entity });
    });
    const entries = loadAuditLog();
    expect(entries).toHaveLength(entities.length);
    entities.forEach((entity) => {
      expect(entries.map((e) => e.entity)).toContain(entity);
    });
  });
});