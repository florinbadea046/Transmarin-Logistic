import { useState, useEffect } from "react";
import { Supplier } from "../types";

type SupplierModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialData: Supplier | null;
  onSave: (supplier: Supplier) => void;
};

export function SupplierModal({
  isOpen,
  onClose,
  initialData,
  onSave,
}: SupplierModalProps) {
  const emptySupplier: Supplier = {
    id: "",
    name: "",
    cui: "",
    address: "",
    phone: "",
    email: "",
    bankAccount: "",
  };

  const [formData, setFormData] = useState<Supplier>(emptySupplier);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData(emptySupplier);
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.cui) {
      alert("Numele și CUI sunt obligatorii");
      return;
    }

    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-slate-900 w-full max-w-lg rounded-xl p-6 border border-slate-700 shadow-xl">
        
        <h2 className="text-xl font-semibold text-white mb-4">
          {initialData ? "Editează Furnizor" : "Adaugă Furnizor"}
        </h2>

        <div className="space-y-4">

          <input
            type="text"
            name="name"
            placeholder="Nume"
            value={formData.name}
            onChange={handleChange}
            className="w-full p-2 rounded bg-slate-800 border border-slate-600 text-white"
          />

          <input
            type="text"
            name="cui"
            placeholder="CUI"
            value={formData.cui}
            onChange={handleChange}
            className="w-full p-2 rounded bg-slate-800 border border-slate-600 text-white"
          />

          <input
            type="text"
            name="address"
            placeholder="Adresă"
            value={formData.address}
            onChange={handleChange}
            className="w-full p-2 rounded bg-slate-800 border border-slate-600 text-white"
          />

          <input
            type="text"
            name="phone"
            placeholder="Telefon"
            value={formData.phone}
            onChange={handleChange}
            className="w-full p-2 rounded bg-slate-800 border border-slate-600 text-white"
          />

          <input
            type="text"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="w-full p-2 rounded bg-slate-800 border border-slate-600 text-white"
          />

          <input
            type="text"
            name="bankAccount"
            placeholder="Cont bancar"
            value={formData.bankAccount}
            onChange={handleChange}
            className="w-full p-2 rounded bg-slate-800 border border-slate-600 text-white"
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-slate-700 text-white hover:bg-slate-600"
          >
            Anulează
          </button>

          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Salvează
          </button>
        </div>
      </div>
    </div>
  );
}