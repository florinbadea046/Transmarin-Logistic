import { z } from "zod";
import type { useTranslation } from "react-i18next";

export function makeEmployeeSchema(t: ReturnType<typeof useTranslation>["t"]) {
  return z.object({
    name: z.string().min(2, t("employees.validation.nameRequired")),
    position: z.string().min(2, t("employees.validation.positionRequired")),
    department: z.string().min(2, t("employees.validation.departmentRequired")),
    phone: z.string().min(6, t("employees.validation.phoneInvalid")),
    email: z.string().email(t("employees.validation.emailInvalid")),
    hireDate: z.string().min(1, t("employees.validation.hireDateRequired")),
    salary: z.coerce.number().min(1, t("employees.validation.salaryRequired")),
  });
}

export type EmployeeFormValues = z.infer<ReturnType<typeof makeEmployeeSchema>>;
