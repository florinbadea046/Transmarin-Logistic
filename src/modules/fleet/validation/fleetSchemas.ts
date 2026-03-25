import { z } from "zod";

export const partSchema = z.object({
  name: z.string().min(2, "Minim 2 caractere"),
  code: z.string().optional(),
  category: z.enum(["engine", "body", "electrical", "other"]),
  quantity: z.number().min(0, ">= 0"),
  minStock: z.number().min(0, ">= 0"),
  unitPrice: z.number().positive("> 0"),
  supplier: z.string().optional(),
});

export const fuelSchema = z.object({
  truckId: z.string().min(1, "Obligatoriu"),
  date: z.string().min(1, "Obligatoriu"),
  mileage: z.number().positive("> 0"),
  liters: z.number().positive("> 0"),
  cost: z.number().positive("> 0"),
});

export const serviceSchema = z.object({
  truckId: z.string().min(1, "Obligatoriu"),
  type: z.enum(["revision", "repair", "itp", "other"]),
  description: z.string().min(5, "Minim 5 caractere"),
  date: z.string().min(1, "Obligatoriu"),
  mileageAtService: z.number().positive("> 0"),
  nextServiceDate: z.string().optional(),
  partsUsed: z.array(
    z.object({
      partId: z.string(),
      quantity: z.number().positive("> 0"),
    }),
  ),
});
