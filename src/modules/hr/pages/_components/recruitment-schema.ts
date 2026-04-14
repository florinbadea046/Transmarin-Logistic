import { z } from "zod";
import type { useTranslation } from "react-i18next";
import { CANDIDATE_STATUSES } from "@/modules/hr/types";

export function makeCandidateSchema(t: ReturnType<typeof useTranslation>["t"]) {
  return z.object({
    name: z.string().min(2, t("recruitment.validation.nameRequired")),
    position: z.string().min(2, t("recruitment.validation.positionRequired")),
    email: z.string().email(t("recruitment.validation.emailInvalid")),
    phone: z.string().min(6, t("recruitment.validation.phoneInvalid")),
    applicationDate: z
      .string()
      .min(1, t("recruitment.validation.dateRequired")),
    rating: z.coerce
      .number()
      .min(1, t("recruitment.validation.ratingRange"))
      .max(5, t("recruitment.validation.ratingRange")),
    notes: z.string().optional(),
    status: z.enum(CANDIDATE_STATUSES),
  });
}

export type CandidateFormValues = z.infer<
  ReturnType<typeof makeCandidateSchema>
>;
