import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Employee } from "@/modules/hr/types";
import { useTranslation } from "react-i18next";

const WATCHED_TYPES = ["license", "tachograph", "adr", "medical"] as const;

type WatchedDocType = (typeof WATCHED_TYPES)[number];

function isWatchedDocType(value: string): value is WatchedDocType {
  return (WATCHED_TYPES as readonly string[]).includes(value);
}

interface AlertRow {
  employeeName: string;
  docType: WatchedDocType;
  docName: string;
  expiryDate: string;
  daysLeft: number;
}

interface Props {
  employees: Employee[];
}

export function DocumentAlerts({ employees }: Props) {
  const { t } = useTranslation();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows: AlertRow[] = [];

  for (const emp of employees) {
    for (const doc of emp.documents) {
      if (!isWatchedDocType(doc.type)) continue;
      if (!doc.expiryDate) continue;
      const expiryDate = new Date(doc.expiryDate);
      expiryDate.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil(
        (expiryDate.getTime() - today.getTime()) / 86400000,
      );
      rows.push({
        employeeName: emp.name,
        docType: doc.type,
        docName: doc.name,
        expiryDate: doc.expiryDate,
        daysLeft,
      });
    }
  }
  //Sortare cele mai urgente, cele expirate sau cele care expira curand primele
  rows.sort((a, b) => a.daysLeft - b.daysLeft);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t("hr.documentAlerts.title")}
          {rows.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {rows.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {t("hr.documentAlerts.empty")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("hr.documentAlerts.columns.employee")}</TableHead>
                <TableHead>{t("hr.documentAlerts.columns.type")}</TableHead>
                <TableHead>{t("hr.documentAlerts.columns.name")}</TableHead>
                <TableHead>
                  {t("hr.documentAlerts.columns.expiryDate")}
                </TableHead>
                <TableHead>{t("hr.documentAlerts.columns.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={`${row.employeeName}-${row.docType}-${row.expiryDate}`}
                >
                  <TableCell className="font-medium">
                    {row.employeeName}
                  </TableCell>
                  <TableCell>
                    {t(`hr.documentAlerts.types.${row.docType}`)}
                  </TableCell>
                  <TableCell>{row.docName || "—"}</TableCell>
                  <TableCell>{row.expiryDate}</TableCell>
                  <TableCell>
                    {row.daysLeft < 0 ? (
                      <Badge variant="destructive">
                        {t("hr.documentAlerts.expired")}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-yellow-500 text-yellow-600 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-400"
                      >
                        {row.daysLeft === 0
                          ? t("hr.documentAlerts.expiresToday")
                          : t("hr.documentAlerts.daysLeft", {
                              count: row.daysLeft,
                            })}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
