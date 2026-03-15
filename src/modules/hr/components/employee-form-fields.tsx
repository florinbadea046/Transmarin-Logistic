import * as React from "react";
import { format } from "date-fns";
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
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEM_HEIGHT = 32;
const MAX_VISIBLE = 5;

function CalendarDropdown({
  value,
  onChange,
  options,
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  options?: Array<{ value: string | number; label: string; disabled?: boolean }>;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const strValue = Array.isArray(value) ? String(value[0]) : String(value);
  const selectedOption = options?.find((opt) => String(opt.value) === strValue);

  const handleSelect = (optValue: string | number) => {
    const event = { target: { value: String(optValue) } } as React.ChangeEvent<HTMLSelectElement>;
    onChange?.(event);
    setOpen(false);
  };

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  React.useEffect(() => {
    if (open && listRef.current) {
      const idx = options?.findIndex((opt) => String(opt.value) === strValue) ?? -1;
      if (idx >= 0) listRef.current.scrollTop = Math.max(0, idx * ITEM_HEIGHT - ITEM_HEIGHT * 2);
    }
  }, [open, value, options, strValue]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 items-center gap-1 rounded-md border border-input bg-background px-2 text-sm font-medium hover:bg-accent"
      >
        {selectedOption?.label}
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>
      {open && (
        <div
          ref={listRef}
          className="absolute top-full left-0 z-50 mt-1 min-w-full overflow-y-auto rounded-md border border-input bg-popover shadow-md"
          style={{ maxHeight: ITEM_HEIGHT * MAX_VISIBLE }}
          onWheel={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {options?.map((opt) => (
            <div
              key={opt.value}
              className={cn(
                "flex cursor-pointer items-center px-2 text-sm hover:bg-accent",
                String(opt.value) === strValue && "bg-primary text-primary-foreground",
                opt.disabled && "pointer-events-none opacity-50"
              )}
              style={{ height: ITEM_HEIGHT }}
              onClick={() => !opt.disabled && handleSelect(opt.value)}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            data-empty={!selectedDate}
            className="w-full justify-start text-start font-normal data-[empty=true]:text-muted-foreground"
          >
            {selectedDate ? format(selectedDate, "MMM d, yyyy") : <span>Data angajării</span>}
            <CalendarIcon className="ms-auto h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            selected={selectedDate}
            onSelect={(date: Date | undefined) => {
              onDateSelect(date);
              form.setValue("hireDate", date ? date.toISOString().slice(0, 10) : "");
            }}
            disabled={(date: Date) => date > new Date() || date < new Date("1900-01-01")}
            components={{ Dropdown: CalendarDropdown }}
          />
        </PopoverContent>
      </Popover>
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
