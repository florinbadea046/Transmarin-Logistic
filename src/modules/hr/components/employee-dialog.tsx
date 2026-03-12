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
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Employee } from "@/modules/hr/types";
import { addItem, generateId } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import {
  EmployeeFormFields,
  employeeSchema,
  type EmployeeFormValues,
} from "./employee-form-fields";

type Props =
  | { mode: "add"; onAdd: () => void }
  | {
      mode: "edit";
      employee: Employee;
      onEdit: (employee: Employee) => void;
      open?: boolean;
      onOpenChange?: (v: boolean) => void;
    };

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

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema) as Resolver<EmployeeFormValues>,
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
      addItem<Employee>(STORAGE_KEYS.employees, {
        ...values,
        id: generateId(),
        documents: [],
      });
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
            <Button variant="outline" size="sm">
              Editează
            </Button>
          ) : (
            <Button variant="default">Adaugă angajat</Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-lg overflow-y-auto max-h-[90dvh]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editare angajat" : "Adaugă angajat"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="space-y-3">
            <EmployeeFormFields
              form={form}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
            />
          </div>
          <div className="flex gap-2 justify-end pt-4">
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
