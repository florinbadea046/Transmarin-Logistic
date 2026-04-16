import { describe, it, expect } from "vitest";
import {
  getInvoiceDueStatus,
  getUnpaidSortedInvoices,
  getStatusColor,
} from "@/utils/due-dates";
import type { Invoice } from "@/modules/accounting/types";

const makeInvoice = (
  id: string,
  status: Invoice["status"],
  dueDate: string,
): Invoice => ({
  id,
  type: "income",
  number: `F-${id}`,
  date: "2026-04-01",
  dueDate,
  clientName: "Client",
  items: [],
  totalWithoutVAT: 0,
  vat: 0,
  total: 0,
  status,
});

function plusDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

describe("getInvoiceDueStatus", () => {
  it("returns 'paid' when invoice already paid", () => {
    expect(getInvoiceDueStatus(makeInvoice("1", "paid", "2020-01-01"))).toBe("paid");
  });

  it("returns 'overdue' when due date is in the past", () => {
    expect(getInvoiceDueStatus(makeInvoice("1", "draft", plusDaysISO(-5)))).toBe("overdue");
  });

  it("returns 'due_soon' when within 3 days", () => {
    expect(getInvoiceDueStatus(makeInvoice("1", "draft", plusDaysISO(2)))).toBe("due_soon");
  });

  it("returns 'ok' when more than 3 days out", () => {
    expect(getInvoiceDueStatus(makeInvoice("1", "draft", plusDaysISO(10)))).toBe("ok");
  });
});

describe("getUnpaidSortedInvoices", () => {
  it("excludes paid invoices", () => {
    const invoices = [
      makeInvoice("1", "paid", "2026-04-01"),
      makeInvoice("2", "draft", "2026-04-05"),
    ];
    const result = getUnpaidSortedInvoices(invoices);
    expect(result.map((i) => i.id)).toEqual(["2"]);
  });

  it("sorts by dueDate ascending", () => {
    const invoices = [
      makeInvoice("1", "draft", "2026-05-15"),
      makeInvoice("2", "sent", "2026-04-01"),
      makeInvoice("3", "overdue", "2026-04-20"),
    ];
    const result = getUnpaidSortedInvoices(invoices);
    expect(result.map((i) => i.id)).toEqual(["2", "3", "1"]);
  });

  it("returns empty when no unpaid", () => {
    expect(
      getUnpaidSortedInvoices([makeInvoice("1", "paid", "2026-04-01")]),
    ).toEqual([]);
  });
});

describe("getStatusColor", () => {
  it("returns red class for overdue", () => {
    expect(getStatusColor("overdue")).toContain("red");
  });

  it("returns yellow class for due_soon", () => {
    expect(getStatusColor("due_soon")).toContain("yellow");
  });

  it("returns green class for ok", () => {
    expect(getStatusColor("ok")).toContain("green");
  });

  it("returns gray for unknown status", () => {
    expect(getStatusColor("paid")).toContain("gray");
    expect(getStatusColor("anything")).toContain("gray");
  });
});
