import type { ServiceRecord } from "@/modules/fleet/types";

export type FormPart = {
  id: string;
  partId: string;
  quantity: number;
};

export type ServiceFormData = {
  truckId: string;
  date: string;
  type: ServiceRecord["type"];
  description: string;
  mileageAtService: number;
  nextServiceDate: string;
  partsUsed: FormPart[];
};

export const createEmptyForm = (): ServiceFormData => ({
  truckId: "",
  date: "",
  type: "revision",
  description: "",
  mileageAtService: 0,
  nextServiceDate: "",
  partsUsed: [],
});
