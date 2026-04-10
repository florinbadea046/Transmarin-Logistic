import { z } from "zod";
import type { useTranslation } from "react-i18next";

export function makeTrainingSchema(t: ReturnType<typeof useTranslation>["t"]) {
  return z.object({
    title: z.string().min(2, t("trainings.validation.titleRequired")),
    type: z.enum(["intern", "extern"], {
      message: t("trainings.validation.typeRequired"),
    }),
    date: z.string().min(1, t("trainings.validation.dateRequired")),
    durationHours: z.coerce
      .number()
      .min(0.5, t("trainings.validation.durationInvalid")),
    trainer: z.string().min(2, t("trainings.validation.trainerRequired")),
    participantIds: z
      .array(z.string())
      .min(1, t("trainings.validation.participantsRequired")),
    status: z.enum(["planificat", "in_curs", "finalizat"], {
      message: t("trainings.validation.statusRequired"),
    }),
  });
}

export type TrainingFormValues = z.infer<ReturnType<typeof makeTrainingSchema>>;
