import * as React from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { addItem, generateId, updateItem } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Candidate, Employee } from "@/modules/hr/types";
import { EmployeeFormFields } from "@/modules/hr/components/employee-form-fields";
import {
  makeEmployeeSchema,
  type EmployeeFormValues,
} from "@/modules/hr/components/employee-form-schema";
import { useHrAuditLog } from "@/hooks/use-hr-audit-log";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  candidate: Candidate | null;
  onCreated?: (employee: Employee, candidateId: string) => void;
}

export function CandidateToEmployeeDialog({
  open,
  onOpenChange,
  candidate,
  onCreated,
}: Props) {
  const { t, i18n } = useTranslation();
  const { log } = useHrAuditLog();

  const schema = React.useMemo(
    () => makeEmployeeSchema(t),
    [t, i18n.language],
  );
  const resolver = React.useMemo(
    () => zodResolver(schema) as Resolver<EmployeeFormValues>,
    [schema],
  );

  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>();

  const form = useForm<EmployeeFormValues>({
    resolver,
    defaultValues: {
      name: "",
      position: "",
      department: "",
      phone: "",
      email: "",
      hireDate: "",
      salary: 0,
    },
  });

  React.useEffect(() => {
    if (!open || !candidate) return;
    form.reset({
      name: candidate.name,
      position: candidate.position,
      department: "",
      phone: candidate.phone,
      email: candidate.email,
      hireDate: "",
      salary: 0,
    });
    setSelectedDate(undefined);
    // form is stable across renders in react-hook-form; excluded to avoid spurious re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, candidate]);

  const onSubmit = (values: EmployeeFormValues) => {
    const newId = generateId();
    const employee: Employee = {
      ...values,
      id: newId,
      documents: [],
    };
    addItem<Employee>(STORAGE_KEYS.employees, employee);
    if (candidate) {
      updateItem<Candidate>(
        STORAGE_KEYS.recruitment,
        (c) => c.id === candidate.id,
        (c) => ({ ...c, employeeId: newId }),
      );
    }
    log({
      action: "create",
      entity: "employee",
      entityId: newId,
      entityLabel: values.name,
      details: `${values.position}, ${values.department}`,
      newValue: {
        name: values.name,
        position: values.position,
        department: values.department,
        salary: values.salary,
      },
    });
    toast.success(t("recruitment.toast.employeeCreated"));
    if (candidate) onCreated?.(employee, candidate.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-y-auto max-h-[90dvh]">
        <DialogHeader>
          <DialogTitle>{t("recruitment.createEmployeeTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
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
                {t("recruitment.actions.cancel")}
              </Button>
            </DialogClose>
            <Button type="submit">{t("recruitment.actions.save")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
