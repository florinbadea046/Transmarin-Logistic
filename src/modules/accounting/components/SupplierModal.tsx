import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Supplier } from "../types";

function makeSupplierSchema(t: (key: string) => string) {
  return z.object({
    id: z.string(),
    name: z.string().min(3, t("suppliers.validation.nameMin")),
    cui: z.string().regex(/^RO[0-9]{2,10}$/, t("suppliers.validation.cuiInvalid")),
    address: z.string().min(1, t("suppliers.validation.addressRequired")),
    phone: z
      .string()
      .regex(/^07[0-9]{8}$/, t("suppliers.validation.phoneInvalid")),
    email: z.string().email(t("suppliers.validation.emailInvalid")),
    bankAccount: z.string().min(1, t("suppliers.validation.bankAccountRequired")),
  });
}

type SupplierFormData = z.infer<ReturnType<typeof makeSupplierSchema>>;

type SupplierModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialData: Supplier | null;
  onSave: (supplier: Supplier) => void;
};

const emptySupplier: SupplierFormData = {
  id: "",
  name: "",
  cui: "",
  address: "",
  phone: "",
  email: "",
  bankAccount: "",
};

export function SupplierModal({
  isOpen,
  onClose,
  initialData,
  onSave,
}: SupplierModalProps) {
  const { t } = useTranslation();
  const supplierSchema = useMemo(() => makeSupplierSchema(t), [t]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: emptySupplier,
  });

  useEffect(() => {
    if (!isOpen) return;
    reset(initialData ?? emptySupplier);
  }, [initialData, isOpen, reset]);

  const onSubmit = (data: SupplierFormData) => {
    onSave(data as Supplier);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initialData
              ? t("suppliers.modal.editTitle")
              : t("suppliers.modal.addTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="name">{t("suppliers.fields.name")}</Label>
              <Input id="name" {...register("name")} />
              {errors.name && (
                <p className="text-red-400 text-xs">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="cui">{t("suppliers.fields.cui")}</Label>
              <Input id="cui" {...register("cui")} placeholder="RO12345678" />
              {errors.cui && (
                <p className="text-red-400 text-xs">{errors.cui.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="address">{t("suppliers.fields.address")}</Label>
            <Input id="address" {...register("address")} />
            {errors.address && (
              <p className="text-red-400 text-xs">{errors.address.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="phone">{t("suppliers.fields.phone")}</Label>
              <Input id="phone" {...register("phone")} placeholder="07xxxxxxxx" />
              {errors.phone && (
                <p className="text-red-400 text-xs">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">{t("suppliers.fields.email")}</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-red-400 text-xs">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="bankAccount">
              {t("suppliers.fields.bankAccount")}
            </Label>
            <Input id="bankAccount" {...register("bankAccount")} />
            {errors.bankAccount && (
              <p className="text-red-400 text-xs">
                {errors.bankAccount.message}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("suppliers.modal.cancel")}
          </Button>

          <Button onClick={handleSubmit(onSubmit)}>
            {initialData ? t("suppliers.modal.save") : t("suppliers.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
