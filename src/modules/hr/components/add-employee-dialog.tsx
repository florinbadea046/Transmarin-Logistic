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
import { format } from "date-fns";

const employeeSchema = z.object({
  name: z.string().min(2, "Numele este obligatoriu"),
  position: z.string().min(2, "Funcția este obligatorie"),
  department: z.string().min(2, "Departamentul este obligatoriu"),
  phone: z.string().min(6, "Telefon invalid"),
  email: z.string().email("Email invalid"),
  hireDate: z.string().min(1, "Data angajării este obligatorie"),
  salary: z.coerce.number().min(1, "Salariul este obligatoriu"),
});

// Tip pentru valorile formularului
type EmployeeFormValues = z.infer<typeof employeeSchema>;

export default function AddEmployeeDialog({
  onAdd,
}: {
  onAdd: (employee: Employee) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    undefined,
  );
  const form = useForm({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: "",
      position: "",
      department: "", // inițial gol
      phone: "",
      email: "",
      hireDate: "",
      salary: 0,
    },
  });

  const handleSubmit = (values: EmployeeFormValues) => {
    const newEmployee: Employee = {
      ...values,
      id: generateId(),
      documents: [],
    };
    addItem<Employee>(STORAGE_KEYS.employees, newEmployee);
    onAdd(newEmployee);
    form.reset();
    setSelectedDate(undefined);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">Adaugă angajat</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adaugă angajat</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
          <Input placeholder="Nume" {...form.register("name")} />
          {form.formState.errors.name && (
            <span className="text-xs text-red-500">
              {form.formState.errors.name.message as string}
            </span>
          )}
          <Input placeholder="Funcție" {...form.register("position")} />
          {form.formState.errors.position && (
            <span className="text-xs text-red-500">
              {form.formState.errors.position.message as string}
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
              {form.formState.errors.department.message as string}
            </span>
          )}
          <Input placeholder="Telefon" {...form.register("phone")} />
          {form.formState.errors.phone && (
            <span className="text-xs text-red-500">
              {form.formState.errors.phone.message as string}
            </span>
          )}
          <Input placeholder="Email" {...form.register("email")} />
          {form.formState.errors.email && (
            <span className="text-xs text-red-500">
              {form.formState.errors.email.message as string}
            </span>
          )}
          <DatePicker
            selected={selectedDate}
            onSelect={(date) => {
              setSelectedDate(date);
              form.setValue(
                "hireDate",
                date ? format(date, "yyyy-MM-dd") : "",
                { shouldValidate: true, shouldTouch: true },
              );
            }}
            placeholder="Data angajării"
          />
          {form.formState.errors.hireDate && (
            <span className="text-xs text-red-500">
              {form.formState.errors.hireDate.message as string}
            </span>
          )}
          <Input
            type="number"
            placeholder="Salariu"
            {...form.register("salary")}
          />
          {form.formState.errors.salary && (
            <span className="text-xs text-red-500">
              {form.formState.errors.salary.message as string}
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
