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
import { useHrAuditLog } from "@/hooks/use-hr-audit-log";
import { EmployeeFormFields } from "./employee-form-fields";
import {
  makeEmployeeSchema,
  type EmployeeFormValues,
} from "./employee-form-schema";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const isEdit = props.mode === "edit";
  const employee = isEdit ? props.employee : undefined;
  const externalOpen = isEdit ? props.open : undefined;
  const externalOnOpenChange = isEdit ? props.onOpenChange : undefined;

  const { log } = useHrAuditLog();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange ?? setInternalOpen;
  const showTrigger = externalOpen === undefined;

  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    employee?.hireDate ? new Date(employee.hireDate) : undefined,
  );

  const schema = React.useMemo(() => makeEmployeeSchema(t), [t]);
  const resolver = React.useMemo(
    () => zodResolver(schema) as Resolver<EmployeeFormValues>,
    [schema],
  );

  const form = useForm<EmployeeFormValues>({
    resolver,
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
      const newId = generateId();
      addItem<Employee>(STORAGE_KEYS.employees, {
        ...values,
        id: newId,
        documents: [],
      });
      log({
        action: "create",
        entity: "employee",
        entityId: newId,
        entityLabel: values.name,
        details: `${values.position}, ${values.department}`,
        newValue: { name: values.name, position: values.position, department: values.department, salary: values.salary },
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
              {t("employees.actions.edit")}
            </Button>
          ) : (
            <Button variant="default">{t("employees.actions.add")}</Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-lg overflow-y-auto max-h-[90dvh]">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("employees.dialog.editTitle")
              : t("employees.dialog.addTitle")}
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
                {t("employees.actions.cancel")}
              </Button>
            </DialogClose>
            <Button type="submit" variant="default">
              {t("employees.actions.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
