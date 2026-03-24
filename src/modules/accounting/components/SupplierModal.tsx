
import { useEffect } from "react";
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

const supplierSchema = z.object({
  id: z.string(),
  name: z.string().min(3, "Numele trebuie să aibă minim 3 caractere"),
  cui: z
    .string()
    .regex(/^RO[0-9]{2,10}$/, "CUI invalid (ex: RO12345678)"),
  address: z.string().min(1, "Adresa este obligatorie"),
  phone: z
    .string()
    .regex(/^07[0-9]{8}$/, "Telefonul trebuie să înceapă cu 07 și să aibă 10 cifre"),
  email: z.string().email("Email invalid"),
  bankAccount: z.string().min(1, "Contul bancar este obligatoriu"),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

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

export function SupplierModal({ isOpen, onClose, initialData, onSave }: SupplierModalProps) {
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
            {initialData ? "Editează Furnizor" : "Adaugă Furnizor"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="name">Nume</Label>

              <Input id="name" {...register("name")} />
              {errors.name && (
                <p className="text-red-400 text-xs">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="cui">CUI</Label>
              <Input id="cui" {...register("cui")} placeholder="RO12345678" />
              {errors.cui && (
                <p className="text-red-400 text-xs">{errors.cui.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="address">Adresă</Label>

            <Input id="address" {...register("address")} />
            {errors.address && (
              <p className="text-red-400 text-xs">{errors.address.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="phone">Telefon</Label>

              <Input id="phone" {...register("phone")} placeholder="07xxxxxxxx" />
              {errors.phone && (
                <p className="text-red-400 text-xs">{errors.phone.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-red-400 text-xs">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="bankAccount">Cont bancar</Label>

            <Input id="bankAccount" {...register("bankAccount")} />
            {errors.bankAccount && (
              <p className="text-red-400 text-xs">{errors.bankAccount.message}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Anulează
          </Button>

          <Button onClick={handleSubmit(onSubmit)}>
            {initialData ? "Salvează" : "Adaugă"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}