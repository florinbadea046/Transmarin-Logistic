import { useTranslation } from "react-i18next";
import {
  User2,
  Mail,
  Phone,
  Briefcase,
  Building2,
  CalendarDays,
  Wallet,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/utils/format";
import type { Employee } from "@/modules/hr/types";

function PersonalField({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border bg-card px-3 py-3">
      <div className="rounded-md bg-muted p-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value || "—"}</p>
      </div>
    </div>
  );
}

export function PersonalTab({ employee }: { employee: Employee }) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("hr.selfService.personal.title")}</CardTitle>
        <CardDescription>
          {t("hr.selfService.personal.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <PersonalField
          icon={User2}
          label={t("hr.selfService.personal.fields.name")}
          value={employee.name}
        />
        <PersonalField
          icon={Briefcase}
          label={t("hr.selfService.personal.fields.position")}
          value={employee.position}
        />
        <PersonalField
          icon={Building2}
          label={t("hr.selfService.personal.fields.department")}
          value={employee.department}
        />
        <PersonalField
          icon={CalendarDays}
          label={t("hr.selfService.personal.fields.hireDate")}
          value={formatDate(employee.hireDate)}
        />
        <PersonalField
          icon={Mail}
          label={t("hr.selfService.personal.fields.email")}
          value={employee.email}
        />
        <PersonalField
          icon={Phone}
          label={t("hr.selfService.personal.fields.phone")}
          value={employee.phone}
        />
        <PersonalField
          icon={Wallet}
          label={t("hr.selfService.personal.fields.salary")}
          value={formatCurrency(employee.salary)}
        />
      </CardContent>
    </Card>
  );
}
