import * as XLSX from "xlsx";

export interface ExcelColumn<T> {
  header: string;
  accessor: (row: T) => string | number | boolean | null | undefined;
}

export interface ExportExcelOptions<T> {
  filename: string;
  sheetName?: string;
  columns: ExcelColumn<T>[];
  rows: T[];
  autoWidth?: boolean;
  footerRow?: (string | number | null | undefined)[];
}

export function exportToExcel<T>(options: ExportExcelOptions<T>): void {
  const {
    filename,
    sheetName = "Sheet1",
    columns,
    rows,
    autoWidth = true,
    footerRow,
  } = options;

  const headers = columns.map((c) => c.header);

  let ws: XLSX.WorkSheet;

  if (footerRow) {
    const data = rows.map((row) => columns.map((c) => c.accessor(row) ?? ""));
    ws = XLSX.utils.aoa_to_sheet([headers, ...data, footerRow]);
  } else {
    const data = rows.map((row) => {
      const obj: Record<string, string | number | boolean | null | undefined> =
        {};
      columns.forEach((col) => {
        obj[col.header] = col.accessor(row);
      });
      return obj;
    });

    ws = XLSX.utils.json_to_sheet(data);

    if (autoWidth && data.length > 0) {
      const colWidths = Object.keys(data[0]).map((key) => ({
        wch:
          Math.max(
            key.length,
            ...data.map((row) => String(row[key] ?? "").length),
          ) + 2,
      }));
      ws["!cols"] = colWidths;
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const safeName = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, safeName);
}
