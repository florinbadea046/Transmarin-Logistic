import * as React from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Employee } from "@/modules/hr/types";
import { addItem, generateId } from "@/utils/local-storage";
import { STORAGE_KEYS, EMPLOYEE_DEPARTMENTS } from "@/data/mock-data";
import { DatePicker } from "@/components/date-picker";

const employeeSchema = z.object({
  name: z.string().min(2, "Numele este obligatoriu"),
  position: z.string().min(2, "Funcția este obligatorie"),
  department: z.string().min(2, "Departamentul este obligatoriu"),
  phone: z.string().min(6, "Telefon invalid"),
  email: z.string().email("Email invalid"),
  hireDate: z.string().min(1, "Data angajării este obligatorie"),
  salary: z.coerce.number().min(1, "Salariul este obligatoriu"),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

type Props =
  | { mode: "add"; onAdd: () => void }
  | { mode: "edit"; employee: Employee; onEdit: (employee: Employee) => void; open?: boolean; onOpenChange?: (v: boolean) => void };

export default function EmployeeDialog(props: Props) {
  const isEdit = props.mode === "edit";
  const employee = isEdit ? props.employee : undefined;
  const externalOpen = isEdit ? props.open : undefined;
  const externalOnOpenChange = isEdit ? props.onOpenChange : undefined;

  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange ?? setInternalOpen;
  const showTrigger = externalOpen === undefined;

  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    employee?.hireDate ? new Date(employee.hireDate) : undefined,
  );

  const form = useForm({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: employee?.name ?? "",
      position: employee?.position ?? "",
      department: employee?.department ?? "",
      phone: employee?.phone ?? "",
      email: employee?.email ?? "",
      hireDate: employee?.hireDate ?? "",
      salary: employee?.salary ?? 0,
    },
  });

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val && !isEdit) {
      form.reset();
      setSelectedDate(undefined);
    }
  };

  const handleSubmit = (values: EmployeeFormValues) => {
    if (props.mode === "edit") {
      props.onEdit({ ...props.employee, ...values });
    } else {
      const newEmployee: Employee = {
        ...values,
        id: generateId(),
        documents: [],
      };
      addItem<Employee>(STORAGE_KEYS.employees, newEmployee);
      props.onAdd();
      form.reset();
      setSelectedDate(undefined);
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {showTrigger && (
        <DialogTrigger asChild>
          {isEdit ? (
            <Button variant="outline" size="sm">Editează</Button>
          ) : (
            <Button variant="default">Adaugă angajat</Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editare angajat" : "Adaugă angajat"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
          <Input placeholder="Nume" {...form.register("name")} />
          {form.formState.errors.name && (
            <span className="text-xs text-red-500">
              {form.formState.errors.name.message}
            </span>
          )}
          <Input placeholder="Funcție" {...form.register("position")} />
          {form.formState.errors.position && (
            <span className="text-xs text-red-500">
              {form.formState.errors.position.message}
            </span>
          )}
          <Select
            value={form.watch("department")}
            onValueChange={(val) =>
              form.setValue("department", val, {
                shouldValidate: true,
                shouldTouch: true,
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Departament" />
            </SelectTrigger>
            <SelectContent>
              {EMPLOYEE_DEPARTMENTS.map((dep) => (
                <SelectItem key={dep} value={dep}>
                  {dep}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.department && (
            <span className="text-xs text-red-500">
              {form.formState.errors.department.message}
            </span>
          )}
          <Input placeholder="Telefon" {...form.register("phone")} />
          {form.formState.errors.phone && (
            <span className="text-xs text-red-500">
              {form.formState.errors.phone.message}
            </span>
          )}
          <Input placeholder="Email" {...form.register("email")} />
          {form.formState.errors.email && (
            <span className="text-xs text-red-500">
              {form.formState.errors.email.message}
            </span>
          )}
          <DatePicker
            selected={selectedDate}
            onSelect={(date) => {
              setSelectedDate(date);
              form.setValue(
                "hireDate",
                date ? date.toISOString().slice(0, 10) : "",
              );
            }}
            placeholder="Data angajării"
          />
          {form.formState.errors.hireDate && (
            <span className="text-xs text-red-500">
              {form.formState.errors.hireDate.message}
            </span>
          )}
          <Input
            type="number"
            placeholder="Salariu"
            {...form.register("salary")}
          />
          {form.formState.errors.salary && (
            <span className="text-xs text-red-500">
              {form.formState.errors.salary.message}
            </span>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Anulează
              </Button>
            </DialogClose>
            <Button type="submit" variant="default">
              Salvează
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
