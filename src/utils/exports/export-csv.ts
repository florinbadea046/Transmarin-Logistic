import Papa from "papaparse";

export interface CsvColumn<T> {
  header: string;
  accessor: (row: T) => string | number | boolean | null | undefined;
}

export interface ExportCsvOptions<T> {
  filename: string;
  columns: CsvColumn<T>[];
  rows: T[];
  delimiter?: string;
  addBom?: boolean;
}

export function exportToCsv<T>(options: ExportCsvOptions<T>): void {
  const {
    filename,
    columns,
    rows,
    delimiter = ",",
    addBom = true,
  } = options;

  const data = rows.map((row) => {
    const obj: Record<string, string | number | boolean | null | undefined> =
      {};
    columns.forEach((col) => {
      obj[col.header] = col.accessor(row);
    });
    return obj;
  });

  const csvContent = Papa.unparse(data, { delimiter });
  const bom = addBom ? "\uFEFF" : "";
  const blob = new Blob([bom + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const safeName = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a") as HTMLAnchorElement;
  link.href = url;
  link.download = safeName;
  link.click();
  URL.revokeObjectURL(url);
}
