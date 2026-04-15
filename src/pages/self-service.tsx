// ──────────────────────────────────────────────────────────
// Self-Service Angajat — "Profilul Meu"
// Selector angajat (simulare login) + 4 tab-uri.
// ──────────────────────────────────────────────────────────

import * as React from "react";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Employee } from "@/modules/hr/types";

import { PersonalTab } from "./_components/self-service/personal-tab";
import { LeavesTab } from "./_components/self-service/leaves-tab";
import { PayslipsTab } from "./_components/self-service/payslips-tab";
import { DocumentsTab } from "./_components/self-service/documents-tab";

const SELF_SERVICE_KEY = "transmarin_selfservice_employee_id";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function SelfServicePage() {
  const { t } = useTranslation();
  const employees = React.useMemo(
    () =>
      getCollection<Employee>(STORAGE_KEYS.employees).sort((a, b) =>
        a.name.localeCompare(b.name, "ro"),
      ),
    [],
  );

  const [employeeId, setEmployeeId] = React.useState<string>(() => {
    const stored = localStorage.getItem(SELF_SERVICE_KEY);
    if (stored && employees.some((e) => e.id === stored)) return stored;
    return employees[0]?.id ?? "";
  });

  React.useEffect(() => {
    if (employeeId) localStorage.setItem(SELF_SERVICE_KEY, employeeId);
  }, [employeeId]);

  const employee = employees.find((e) => e.id === employeeId);

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("hr.selfService.title")}</h1>
      </Header>
      <Main className="space-y-6">
        <Card>
          <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {employee ? initials(employee.name) : "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">
                  {employee?.name ?? t("hr.selfService.selectedPlaceholder")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {employee
                    ? `${t(`hr.selfService.positions.${employee.position}`, employee.position)} · ${t(`hr.selfService.departments.${employee.department}`, employee.department)}`
                    : t("hr.selfService.emptyHint")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {t("hr.selfService.simulateLogin")}
              </span>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger className="w-64">
                  <SelectValue
                    placeholder={t("hr.selfService.selectEmployee")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {!employee ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              {t("hr.selfService.noEmployees")}
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="personal">
            <TabsList>
              <TabsTrigger value="personal">
                {t("hr.selfService.tabs.personal")}
              </TabsTrigger>
              <TabsTrigger value="leaves">
                {t("hr.selfService.tabs.leaves")}
              </TabsTrigger>
              <TabsTrigger value="payslips">
                {t("hr.selfService.tabs.payslips")}
              </TabsTrigger>
              <TabsTrigger value="documents">
                {t("hr.selfService.tabs.documents")}
              </TabsTrigger>
            </TabsList>

            <Separator className="my-4" />

            <TabsContent value="personal">
              <PersonalTab employee={employee} />
            </TabsContent>
            <TabsContent value="leaves">
              <LeavesTab employee={employee} />
            </TabsContent>
            <TabsContent value="payslips">
              <PayslipsTab employee={employee} />
            </TabsContent>
            <TabsContent value="documents">
              <DocumentsTab employee={employee} />
            </TabsContent>
          </Tabs>
        )}
      </Main>
    </>
  );
}
