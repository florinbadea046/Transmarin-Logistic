import { useEffect, useState } from "react";
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

type SupplierModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialData: Supplier | null;
  onSave: (supplier: Supplier) => void;
};

const emptySupplier: Supplier = {
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
  const [formData, setFormData] = useState<Supplier>(emptySupplier);

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData(emptySupplier);
    }
  }, [initialData, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.cui) {
      alert("Numele și CUI sunt obligatorii");
      return;
    }
    onSave(formData);
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="name">Nume</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cui">CUI</Label>
              <Input
                id="cui"
                name="cui"
                value={formData.cui}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="address">Adresă</Label>
            <Input
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="bankAccount">Cont bancar</Label>
            <Input
              id="bankAccount"
              name="bankAccount"
              value={formData.bankAccount}
              onChange={handleChange}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Anulează
          </Button>
          <Button onClick={handleSubmit}>
            {initialData ? "Salvează" : "Adaugă"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}