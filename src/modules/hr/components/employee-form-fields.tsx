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
import { EMPLOYEE_DEPARTMENTS } from "@/data/mock-data";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { CalendarDropdown } from "./calendar-dropdown";
import { useTranslation } from "react-i18next";
import { getEmployeeDepartmentLabel } from "../utils/department-label";
import type { EmployeeFormValues } from "./employee-form-schema";

interface Props {
  form: UseFormReturn<EmployeeFormValues>;
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
}

export function EmployeeFormFields({
  form,
  selectedDate,
  onDateSelect,
}: Props) {
  const { t } = useTranslation();
  const department = useWatch({ control: form.control, name: "department" });

  return (
    <>
      <Input
        placeholder={t("employees.fields.name")}
        {...form.register("name")}
      />
      {form.formState.errors.name && (
        <span className="text-xs text-red-500">
          {form.formState.errors.name.message}
        </span>
      )}
      <Input
        placeholder={t("employees.fields.position")}
        {...form.register("position")}
      />
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
          <SelectValue placeholder={t("employees.fields.department")} />
        </SelectTrigger>
        <SelectContent>
          {EMPLOYEE_DEPARTMENTS.map((dep) => (
            <SelectItem key={dep} value={dep}>
              {getEmployeeDepartmentLabel(t, dep)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {form.formState.errors.department && (
        <span className="text-xs text-red-500">
          {form.formState.errors.department.message}
        </span>
      )}
      <Input
        placeholder={t("employees.fields.phone")}
        {...form.register("phone")}
      />
      {form.formState.errors.phone && (
        <span className="text-xs text-red-500">
          {form.formState.errors.phone.message}
        </span>
      )}
      <Input
        placeholder={t("employees.fields.email")}
        {...form.register("email")}
      />
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
            {selectedDate ? (
              format(selectedDate, "MMM d, yyyy")
            ) : (
              <span>{t("employees.fields.hireDate")}</span>
            )}
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
              form.setValue("hireDate", date ? format(date, "yyyy-MM-dd") : "");
            }}
            disabled={(date: Date) =>
              date > new Date() || date < new Date("1900-01-01")
            }
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
        placeholder={t("employees.fields.salary")}
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
