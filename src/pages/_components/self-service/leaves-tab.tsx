import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import { formatDate } from "@/utils/format";
import type { Employee, LeaveRequest } from "@/modules/hr/types";
import { NewLeaveDialog } from "./new-leave-dialog";

export function LeavesTab({ employee }: { employee: Employee }) {
  const { t } = useTranslation();
  const loadLeaves = React.useCallback(
    () =>
      getCollection<LeaveRequest>(STORAGE_KEYS.leaveRequests)
        .filter((l) => l.employeeId === employee.id)
        .sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [employee.id],
  );
  const [leaves, setLeaves] = React.useState<LeaveRequest[]>(loadLeaves);
  React.useEffect(() => {
    setLeaves(loadLeaves());
  }, [loadLeaves]);

  const totalApproved = leaves
    .filter((l) => l.status === "approved")
    .reduce((s, l) => s + l.days, 0);
  const pendingCount = leaves.filter((l) => l.status === "pending").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{t("hr.selfService.leaves.title")}</CardTitle>
            <CardDescription>
              {t("hr.selfService.leaves.summary", {
                approved: totalApproved,
                pending: pendingCount,
              })}
            </CardDescription>
          </div>
          <NewLeaveDialog
            employee={employee}
            onCreated={() => setLeaves(loadLeaves())}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("hr.selfService.leaves.columns.type")}</TableHead>
                <TableHead>
                  {t("hr.selfService.leaves.columns.period")}
                </TableHead>
                <TableHead>{t("hr.selfService.leaves.columns.days")}</TableHead>
                <TableHead>
                  {t("hr.selfService.leaves.columns.status")}
                </TableHead>
                <TableHead>
                  {t("hr.selfService.leaves.columns.reason")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaves.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {t("hr.selfService.leaves.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                leaves.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap">
                      {t(`hr.selfService.leaves.types.${l.type}`)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(l.startDate)} – {formatDate(l.endDate)}
                    </TableCell>
                    <TableCell>{l.days}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          l.status === "rejected" ? "destructive" : "secondary"
                        }
                        className={
                          l.status === "approved"
                            ? "bg-green-600 text-white hover:bg-green-600"
                            : undefined
                        }
                      >
                        {t(`hr.selfService.leaves.status.${l.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {l.reason || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
