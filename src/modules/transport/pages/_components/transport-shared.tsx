// ──────────────────────────────────────────────────────────
// Shared — helpers și componente reutilizabile pentru
// secțiunea Șoferi & Camioane
// ──────────────────────────────────────────────────────────

import * as React from "react";
import {
  type ColumnDef,
  flexRender,
  type Table as TanstackTable,
} from "@tanstack/react-table";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/data-table/pagination";
import { DataTableToolbar } from "@/components/data-table/toolbar";

import type { Driver, Truck } from "@/modules/transport/types";
import { useMobile } from "@/hooks/use-mobile";

// ── Helpers ────────────────────────────────────────────────

export function daysUntilExpiry(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${dateStr}T00:00:00`);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("ro-RO");
}

// ── Componente mici ────────────────────────────────────────

/** Afișează data cu alertă vizuală dacă expiră în ≤30 zile */
export function ExpiryCell({ dateStr }: { dateStr: string }) {
  const days = daysUntilExpiry(dateStr);
  return (
    <span className={days <= 30 ? "font-semibold text-yellow-700 dark:text-yellow-400" : ""}>
      {formatDate(dateStr)}
      {days <= 30 && <AlertTriangle className="ml-1 inline h-3.5 w-3.5" />}
    </span>
  );
}

/** Rând label + valoare pentru card-urile mobile */
export function CardRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

// ── EntityTable ────────────────────────────────────────────

/**
 * Tabel generic cu toolbar și paginare.
 * Pe mobile (< 768px) randează renderMobileCard în loc de tabel.
 */
export function EntityTable<TData>({
  table,
  columns,
  searchPlaceholder,
  searchKey,
  filterConfig,
  columnVisibilityClass,
  emptyText,
  renderMobileCard,
}: {
  table: TanstackTable<TData>;
  columns: ColumnDef<TData>[];
  searchPlaceholder: string;
  searchKey: string;
  filterConfig: { columnId: string; title: string; options: { value: string; label: string }[] }[];
  columnVisibilityClass?: Record<string, string>;
  emptyText: string;
  renderMobileCard?: (row: TData) => React.ReactNode;
}) {
  const isMobile = useMobile(768);
  const rows = table.getRowModel().rows;

  return (
    <div className="space-y-4">
      <DataTableToolbar
        table={table}
        searchPlaceholder={searchPlaceholder}
        searchKey={searchKey}
        filters={filterConfig}
      />

      {isMobile && renderMobileCard ? (
        <div className="space-y-3">
          {rows.length ? (
            rows.map((row) => (
              <React.Fragment key={row.id}>
                {renderMobileCard(row.original)}
              </React.Fragment>
            ))
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">{emptyText}</p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={columnVisibilityClass?.[header.column.id]}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={columnVisibilityClass?.[cell.column.id]}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {emptyText}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <DataTablePagination table={table} pageSizes={[5, 10, 20]} />
    </div>
  );
}

// ── ExpiryAlerts ───────────────────────────────────────────

export function ExpiryAlerts({
  expiringDrivers,
  expiringTrucks,
}: {
  expiringDrivers: Driver[];
  expiringTrucks: Truck[];
}) {
  const { t } = useTranslation();

  if (expiringDrivers.length === 0 && expiringTrucks.length === 0) return null;

  return (
    <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950">
      <div className="flex items-start gap-2 text-yellow-800 dark:text-yellow-200">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="space-y-2">
          {expiringDrivers.length > 0 && (
            <div>
              <p className="font-medium">{t("expiry.alerts.driversTitle")}</p>
              <ul className="mt-1 space-y-0.5 text-sm">
                {expiringDrivers.map((d) => {
                  const days = daysUntilExpiry(d.licenseExpiry);
                  return (
                    <li key={d.id}>
                      <span className="font-medium">{d.name}</span> —{" "}
                      {days <= 0
                        ? t("expiry.alerts.expired")
                        : t("expiry.alerts.expiresIn", {
                            days,
                            plural: days === 1 ? "" : "e",
                            date: formatDate(d.licenseExpiry),
                          })}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {expiringTrucks.length > 0 && (
            <div>
              <p className="font-medium">{t("expiry.alerts.trucksTitle")}</p>
              <ul className="mt-1 space-y-0.5 text-sm">
                {expiringTrucks.map((truck) => {
                  const itpDays = daysUntilExpiry(truck.itpExpiry);
                  const rcaDays = daysUntilExpiry(truck.rcaExpiry);
                  const vigDays = daysUntilExpiry(truck.vignetteExpiry);
                  return (
                    <li key={truck.id}>
                      <span className="font-medium">{truck.plateNumber}</span> —{" "}
                      {itpDays <= 30 && (
                        <span>
                          {itpDays <= 0
                            ? t("expiry.alerts.itpExpired")
                            : t("expiry.alerts.itpExpires", { date: formatDate(truck.itpExpiry) })}{" "}
                        </span>
                      )}
                      {rcaDays <= 30 && (
                        <span>
                          {rcaDays <= 0
                            ? t("expiry.alerts.rcaExpired")
                            : t("expiry.alerts.rcaExpires", { date: formatDate(truck.rcaExpiry) })}{" "}
                        </span>
                      )}
                      {vigDays <= 30 && (
                        <span>
                          {vigDays <= 0
                            ? t("expiry.alerts.vignetteExpired")
                            : t("expiry.alerts.vignetteExpires", { date: formatDate(truck.vignetteExpiry) })}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}