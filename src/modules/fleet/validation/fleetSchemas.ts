import { z } from "zod";

export function makePartSchema(t: (k: string, opts?: Record<string, unknown>) => string) {
  return z.object({
    name: z.string().min(2, t("fleet.validation.minChars", { count: 2 } as Record<string, unknown>)),
    code: z.string().optional(),
    category: z.enum(["engine", "body", "electrical", "other"]),
    quantity: z.number().min(0, t("fleet.validation.minZero")),
    minStock: z.number().min(0, t("fleet.validation.minZero")),
    unitPrice: z.number().positive(t("fleet.validation.positive")),
    supplier: z.string().optional(),
  });
}

export type PartSchema = ReturnType<typeof makePartSchema>;

export function makeFuelSchema(t: (k: string) => string) {
  return z.object({
    truckId: z.string().min(1, t("fleet.validation.required")),
    date: z.string().min(1, t("fleet.validation.required")),
    mileage: z.number().positive(t("fleet.validation.positive")),
    liters: z.number().positive(t("fleet.validation.positive")),
    cost: z.number().positive(t("fleet.validation.positive")),
  });
}

export function makeServiceSchema(t: (k: string, opts?: Record<string, unknown>) => string) {
  return z.object({
    truckId: z.string().min(1, t("fleet.validation.required")),
    type: z.enum(["revision", "repair", "itp", "other"]),
    description: z.string().min(5, t("fleet.validation.minChars", { count: 5 } as Record<string, unknown>)),
    date: z.string().min(1, t("fleet.validation.required")),
    mileageAtService: z.number().positive(t("fleet.validation.positive")),
    nextServiceDate: z.string().optional(),
    partsUsed: z.array(
      z.object({
        partId: z.string(),
        quantity: z.number().positive(t("fleet.validation.positive")),
      }),
    ),
  });
}
