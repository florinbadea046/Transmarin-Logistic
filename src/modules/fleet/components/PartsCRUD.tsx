import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { STORAGE_KEYS } from "@/data/mock-data";
import { getCollection } from "@/utils/local-storage";
import type { Part } from "@/modules/fleet/types";
import { AllocatePart } from "@/modules/fleet/components/AllocatePart";
import { savePart, deletePart, isLowStock } from "@/modules/fleet/utils/partsUtils";
import { exportPartsToExcel } from "@/modules/fleet/utils/exportExcel";

const emptyForm: Omit<Part, "id"> = {
    name: "",
    category: "",
    quantity: 0,
    unitPrice: 0,
    supplier: "",
    minStock: 0,
};

export function PartsCRUD() {
    const [parts, setParts] = useState<Part[]>([]);
    const [open, setOpen] = useState(false);
    const [editingPart, setEditingPart] = useState<Part | null>(null);
    const [form, setForm] = useState<Omit<Part, "id">>(emptyForm);

    useEffect(() => {
        setParts(getCollection<Part>(STORAGE_KEYS.parts));
    }, []);

    const save = (updated: Part[]) => {
        setParts(updated);
        localStorage.setItem(STORAGE_KEYS.parts, JSON.stringify(updated));
    };

    const handleOpen = (part?: Part) => {
        if (part) {
            setEditingPart(part);
            const { id, ...rest } = part;
            setForm(rest);
        } else {
            setEditingPart(null);
            setForm(emptyForm);
        }
        setOpen(true);
    };

    const handleSubmit = () => {
        save(savePart(parts, form, editingPart));
        setOpen(false);
    };

    const handleDelete = (id: string) => {
        save(deletePart(parts, id));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: ["quantity", "unitPrice", "minStock"].includes(name) ? Number(value) : value,
        }));
    };

    return (
        <div>
            <div className="flex justify-start gap-2 mb-4 px-6">
                <Button onClick={() => handleOpen()}>+ Adaugă piesă</Button>
                <Button variant="outline" onClick={() => exportPartsToExcel(parts)}>
                    ⬇ Export Excel
                </Button>
            </div>

            {parts.length === 0 ? (
                <p className="text-muted-foreground text-center py-10">Nu există piese înregistrate.</p>
            ) : (
                <div className="overflow-x-auto w-full px-6">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b text-muted-foreground text-left">
                                <th className="pb-3 pr-4 font-medium">Nume</th>
                                <th className="pb-3 pr-4 font-medium">Categorie</th>
                                <th className="pb-3 pr-4 font-medium">Furnizor</th>
                                <th className="pb-3 pr-4 font-medium">Preț unitar</th>
                                <th className="pb-3 pr-4 font-medium">Cantitate</th>
                                <th className="pb-3 pr-4 font-medium">Stoc</th>
                                <th className="pb-3 text-center font-medium">Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {parts.map((part) => {
                                const isLow = isLowStock(part);
                                return (
                                    <tr key={part.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                                        <td className="py-3 pr-4 font-semibold">{part.name}</td>
                                        <td className="py-3 pr-4">{part.category}</td>
                                        <td className="py-3 pr-4">{part.supplier}</td>
                                        <td className="py-3 pr-4">{part.unitPrice.toLocaleString("ro-RO")} RON</td>
                                        <td className={`py-3 pr-4 font-semibold ${isLow ? "text-red-500" : ""}`}>
                                            {part.quantity} buc.
                                        </td>
                                        <td className="py-3 pr-4">
                                            <Badge variant={isLow ? "destructive" : "default"}>
                                                {isLow ? "Stoc scăzut" : "OK"}
                                            </Badge>
                                        </td>
                                        <td className="py-3">
                                            <div className="flex gap-2 items-center justify-center">
                                                <Button size="sm" variant="outline" onClick={() => handleOpen(part)}>
                                                    Editează
                                                </Button>
                                                <AllocatePart part={part} />
                                                <Button size="sm" variant="destructive" onClick={() => handleDelete(part.id)}>
                                                    Șterge
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingPart ? "Editează piesă" : "Adaugă piesă"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="name">Nume</Label>
                                <Input id="name" name="name" value={form.name} onChange={handleChange} />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="category">Categorie</Label>
                                <Input id="category" name="category" value={form.category} onChange={handleChange} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="supplier">Furnizor</Label>
                            <Input id="supplier" name="supplier" value={form.supplier} onChange={handleChange} />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="quantity">Cantitate</Label>
                                <Input id="quantity" name="quantity" type="number" value={form.quantity} onChange={handleChange} />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="unitPrice">Preț unitar</Label>
                                <Input id="unitPrice" name="unitPrice" type="number" value={form.unitPrice} onChange={handleChange} />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="minStock">Stoc minim</Label>
                                <Input id="minStock" name="minStock" type="number" value={form.minStock} onChange={handleChange} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Anulează</Button>
                        <Button onClick={handleSubmit}>{editingPart ? "Salvează" : "Adaugă"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}