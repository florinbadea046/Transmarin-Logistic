import * as React from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Employee, EmployeeDocument } from "@/modules/hr/types";
import { addItem, generateId } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import {
  EmployeeFormFields,
  employeeSchema,
  type EmployeeFormValues,
} from "./employee-form-fields";
import { DocumentsTab } from "./documents-tab";

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

  const [documents, setDocuments] = React.useState<EmployeeDocument[]>(
    employee?.documents ?? [],
  );

  React.useEffect(() => {
    if (open && isEdit) setDocuments(employee!.documents ?? []);
  }, [open, employee, isEdit]);

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val && !isEdit) {
      form.reset();
      setSelectedDate(undefined);
    }
  };

  const handleSubmit = (values: EmployeeFormValues) => {
    if (props.mode === "edit") {
      props.onEdit({ ...props.employee, ...values, documents });
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
          {isEdit ? (
            <Tabs defaultValue="personal" className="space-y-3">
              <TabsList className="w-full">
                <TabsTrigger value="personal" className="flex-1">
                  Date personale
                </TabsTrigger>
                <TabsTrigger value="documents" className="flex-1">
                  Documente
                  {documents.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                      {documents.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="personal" className="space-y-3 mt-0 min-h-[340px]">
                <EmployeeFormFields
                  form={form}
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                />
              </TabsContent>
              <TabsContent value="documents" className="space-y-2 mt-0 min-h-[340px]">
                <DocumentsTab documents={documents} onChange={setDocuments} />
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-3">
              <EmployeeFormFields
                form={form}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
              />
            </div>
          )}
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
