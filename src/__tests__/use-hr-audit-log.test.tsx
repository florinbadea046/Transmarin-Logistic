// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHrAuditLog, loadHrAuditLog, type HrAuditEntry } from "@/hooks/use-hr-audit-log";
import { STORAGE_KEYS } from "@/data/mock-data";

describe("useHrAuditLog", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("logs entry with auto-generated id, timestamp, user", () => {
    const { result } = renderHook(() => useHrAuditLog());
    act(() => {
      result.current.log({
        action: "create",
        entity: "employee",
        entityId: "e1",
        entityLabel: "Ion Popescu",
      });
    });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.hr_audit_log)!) as HrAuditEntry[];
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBeTruthy();
    expect(stored[0].timestamp).toBeTruthy();
    expect(stored[0].user).toBe("Admin");
    expect(stored[0].action).toBe("create");
    expect(stored[0].entity).toBe("employee");
  });

  it("prepends newer entries to log (newest first)", () => {
    const { result } = renderHook(() => useHrAuditLog());
    act(() => {
      result.current.log({ action: "create", entity: "employee", entityId: "e1", entityLabel: "First" });
    });
    act(() => {
      result.current.log({ action: "update", entity: "employee", entityId: "e1", entityLabel: "Second" });
    });
    const log = loadHrAuditLog();
    expect(log[0].entityLabel).toBe("Second");
    expect(log[1].entityLabel).toBe("First");
  });

  it("uses authenticated user name from localStorage", () => {
    localStorage.setItem("transmarin_auth_user", JSON.stringify({ name: "Maria HR" }));
    const { result } = renderHook(() => useHrAuditLog());
    act(() => {
      result.current.log({ action: "create", entity: "leave", entityId: "l1", entityLabel: "x" });
    });
    expect(loadHrAuditLog()[0].user).toBe("Maria HR");
  });

  it("falls back to email when name not in auth user", () => {
    localStorage.setItem("transmarin_auth_user", JSON.stringify({ email: "x@y.com" }));
    const { result } = renderHook(() => useHrAuditLog());
    act(() => {
      result.current.log({ action: "create", entity: "leave", entityId: "l1", entityLabel: "x" });
    });
    expect(loadHrAuditLog()[0].user).toBe("x@y.com");
  });

  it("supports all entity types", () => {
    const { result } = renderHook(() => useHrAuditLog());
    const entities: HrAuditEntry["entity"][] = ["employee", "leave", "bonus", "document", "attendance", "evaluation", "training", "candidate", "shift"];
    entities.forEach((entity, i) => {
      act(() => {
        result.current.log({ action: "create", entity, entityId: `id-${i}`, entityLabel: entity });
      });
    });
    expect(loadHrAuditLog()).toHaveLength(entities.length);
  });

  it("supports approve and reject actions", () => {
    const { result } = renderHook(() => useHrAuditLog());
    act(() => {
      result.current.log({ action: "approve", entity: "leave", entityId: "l1", entityLabel: "x" });
    });
    act(() => {
      result.current.log({ action: "reject", entity: "leave", entityId: "l2", entityLabel: "y" });
    });
    const log = loadHrAuditLog();
    expect(log.map((e) => e.action).sort()).toEqual(["approve", "reject"]);
  });

  it("preserves oldValue/newValue on update entries", () => {
    const { result } = renderHook(() => useHrAuditLog());
    act(() => {
      result.current.log({
        action: "update",
        entity: "employee",
        entityId: "e1",
        entityLabel: "Ion",
        oldValue: { salary: 5000 },
        newValue: { salary: 5500 },
      });
    });
    const entry = loadHrAuditLog()[0];
    expect(entry.oldValue).toEqual({ salary: 5000 });
    expect(entry.newValue).toEqual({ salary: 5500 });
  });

  it("returns empty array when log is empty", () => {
    expect(loadHrAuditLog()).toEqual([]);
  });

  it("returns empty when log has malformed JSON", () => {
    localStorage.setItem(STORAGE_KEYS.hr_audit_log, "not-json");
    expect(loadHrAuditLog()).toEqual([]);
  });
});
