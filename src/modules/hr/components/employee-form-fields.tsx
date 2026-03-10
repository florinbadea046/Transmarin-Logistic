import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { EMPLOYEE_DEPARTMENTS } from "@/data/mock-data";
import { DatePicker } from "@/components/date-picker";

export const employeeSchema = z.object({
  name: z.string().min(2, "Numele este obligatoriu"),
  position: z.string().min(2, "Funcția este obligatorie"),
  department: z.string().min(2, "Departamentul este obligatoriu"),
  phone: z.string().min(6, "Telefon invalid"),
  email: z.string().email("Email invalid"),
  hireDate: z.string().min(1, "Data angajării este obligatorie"),
  salary: z.coerce.number().min(1, "Salariul este obligatoriu"),
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;

interface Props {
  form: UseFormReturn<EmployeeFormValues>;
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
}

export function EmployeeFormFields({ form, selectedDate, onDateSelect }: Props) {
  const department = useWatch({ control: form.control, name: "department" });

  return (
    <>
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
        value={department}
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
          onDateSelect(date);
          form.setValue("hireDate", date ? date.toISOString().slice(0, 10) : "");
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
    </>
  );
}
