import { z } from "zod";
import type { useTranslation } from "react-i18next";
import {
  EQUIPMENT_TYPES,
  EQUIPMENT_CONDITIONS,
} from "@/modules/hr/types";

export function makeEquipmentSchema(
  t: ReturnType<typeof useTranslation>["t"],
) {
  return z
    .object({
      type: z.enum(EQUIPMENT_TYPES, {
        message: t("equipment.validation.typeRequired"),
      }),
      inventoryNumber: z
        .string()
        .trim()
        .min(1, t("equipment.validation.inventoryRequired")),
      employeeId: z.string().min(1, t("equipment.validation.employeeRequired")),
      assignedDate: z
        .string()
        .min(1, t("equipment.validation.assignedDateRequired")),
      returnedDate: z.string().optional().or(z.literal("")),
      returnedConfirmed: z.boolean().default(false),
      condition: z.enum(EQUIPMENT_CONDITIONS, {
        message: t("equipment.validation.conditionRequired"),
      }),
      value: z.coerce.number().min(0, t("equipment.validation.valueInvalid")),
      notes: z.string().optional().or(z.literal("")),
    })
    .refine(
      (data) =>
        !data.returnedDate || data.returnedDate >= data.assignedDate,
      {
        message: t("equipment.validation.returnedBeforeAssigned"),
        path: ["returnedDate"],
      },
    )
}

export type EquipmentFormValues = z.infer<
  ReturnType<typeof makeEquipmentSchema>
>;
