import { useTranslation } from "react-i18next";
import { FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/utils/format";
import type { Employee } from "@/modules/hr/types";

export function DocumentsTab({ employee }: { employee: Employee }) {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("hr.selfService.documents.title")}</CardTitle>
        <CardDescription>
          {t("hr.selfService.documents.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {employee.documents.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {t("hr.selfService.documents.empty")}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {employee.documents.map((d) => {
              const expired = d.expiryDate && d.expiryDate < today;
              return (
                <div
                  key={d.id}
                  className="flex items-start gap-3 rounded-md border bg-card p-3"
                >
                  <div className="rounded-md bg-muted p-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">
                        {t(`hr.selfService.documents.names.${d.name}`, d.name)}
                      </p>
                      {expired && (
                        <Badge variant="destructive">
                          {t("hr.selfService.documents.expired")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("hr.selfService.documents.labels.type")}{" "}
                      {t(`hr.selfService.documents.types.${d.type}`, d.type)}
                    </p>
                    {d.documentNumber && (
                      <p className="text-xs text-muted-foreground">
                        {t("hr.selfService.documents.labels.number")}{" "}
                        {d.documentNumber}
                      </p>
                    )}
                    {d.expiryDate && (
                      <p className="text-xs text-muted-foreground">
                        {t("hr.selfService.documents.labels.expires")}{" "}
                        {formatDate(d.expiryDate)}
                      </p>
                    )}
                    {d.notes && (
                      <p className="text-xs italic text-muted-foreground">
                        {d.notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
