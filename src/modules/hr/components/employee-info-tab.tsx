import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, X, Check } from "lucide-react";
import { updateItem } from "@/utils/local-storage";
import { STORAGE_KEYS, EMPLOYEE_DEPARTMENTS } from "@/data/mock-data";
import type { Employee } from "@/modules/hr/types";
import { formatDate } from "@/utils/format";
import { getEmployeeDepartmentLabel } from "../utils/department-label";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useHrAuditLog } from "@/hooks/use-hr-audit-log";

// ── Info Tab ─────────────────────────────────────────────────

interface InfoTabProps {
  employee: Employee;
  onUpdate: (emp: Employee) => void;
}

export function InfoTab({ employee, onUpdate }: InfoTabProps) {
  const { t } = useTranslation();
  const { log } = useHrAuditLog();
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState({
    name: employee.name,
    position: employee.position,
    department: employee.department,
    phone: employee.phone,
    email: employee.email,
    hireDate: employee.hireDate,
    salary: String(employee.salary),
  });

  React.useEffect(() => {
    setForm({
      name: employee.name,
      position: employee.position,
      department: employee.department,
      phone: employee.phone,
      email: employee.email,
      hireDate: employee.hireDate,
      salary: String(employee.salary),
    });
    setEditing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id]);

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error("Numele nu poate fi gol.");
      return;
    }
    const parsedSalary = parseFloat(form.salary);
    if (isNaN(parsedSalary) || parsedSalary < 0) {
      toast.error("Salariul trebuie să fie un număr pozitiv.");
      return;
    }
    const updated: Employee = {
      ...employee,
      name: form.name.trim(),
      position: form.position.trim(),
      department: form.department,
      phone: form.phone.trim(),
      email: form.email.trim(),
      hireDate: employee.hireDate,
      salary: parsedSalary,
    };
    updateItem<Employee>(
      STORAGE_KEYS.employees,
      (e) => e.id === employee.id,
      () => updated,
    );
    log({
      action: "update",
      entity: "employee",
      entityId: employee.id,
      entityLabel: updated.name,
      oldValue: { name: employee.name, position: employee.position, salary: employee.salary },
      newValue: { name: updated.name, position: updated.position, salary: updated.salary },
    });
    onUpdate(updated);
    setEditing(false);
    toast.success("Profil actualizat cu succes");
  };

  const handleCancel = () => {
    setForm({
      name: employee.name,
      position: employee.position,
      department: employee.department,
      phone: employee.phone,
      email: employee.email,
      hireDate: employee.hireDate,
      salary: String(employee.salary),
    });
    setEditing(false);
  };

  const fields: { label: string; key: keyof typeof form }[] = [
    { label: "Nume", key: "name" },
    { label: "Funcție", key: "position" },
    { label: "Telefon", key: "phone" },
    { label: "Email", key: "email" },
    { label: "Salariu (RON)", key: "salary" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Date personale</p>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Editează
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              <X className="h-3.5 w-3.5 mr-1.5" />
              Anulează
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Salvează
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map(({ label, key }) =>
          editing ? (
            <div key={key} className="space-y-1">
              <p className="text-xs text-muted-foreground">{label}</p>
              <Input
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
          ) : (
            <div key={key} className="space-y-0.5">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-medium">
                {key === "salary"
                  ? `${Number(form[key]).toLocaleString("ro-RO")} RON`
                  : form[key] || "—"}
              </p>
            </div>
          ),
        )}

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Departament</p>
          {editing ? (
            <Select
              value={form.department}
              onValueChange={(v) => setForm((f) => ({ ...f, department: v }))}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYEE_DEPARTMENTS.map((dep) => (
                  <SelectItem key={dep} value={dep}>
                    {getEmployeeDepartmentLabel(t, dep)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm font-medium">
              {getEmployeeDepartmentLabel(t, form.department)}
            </p>
          )}
        </div>

        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">Data angajării</p>
          <p className="text-sm font-medium">{formatDate(employee.hireDate)}</p>
        </div>
      </div>
    </div>
  );
}
