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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Plus } from "lucide-react";
import { ExpiryDatePicker } from "./expiry-date-picker";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Employee, EmployeeDocument } from "@/modules/hr/types";
import { addItem, generateId } from "@/utils/local-storage";
import { STORAGE_KEYS, EMPLOYEE_DEPARTMENTS } from "@/data/mock-data";
import { DatePicker } from "@/components/date-picker";

const TYPE_LABELS: Record<EmployeeDocument["type"], string> = {
  license: "Permis",
  tachograph: "Tahograf",
  adr: "ADR",
  medical: "Medical",
  contract: "Contract",
  other: "Altele",
};

function getExpiryBadge(expiryDate?: string) {
  if (!expiryDate) {
    return <Badge variant="secondary">Fără expirare</Badge>;
  }
  const today = new Date().toISOString().slice(0, 10);
  if (expiryDate < today) {
    return <Badge variant="destructive">Expirat</Badge>;
  }
  const days = Math.floor(
    (new Date(expiryDate).getTime() - new Date(today).getTime()) / 86400000,
  );
  if (days <= 30) {
    return (
      <Badge
        className="border-yellow-500 text-yellow-600 bg-yellow-50"
        variant="outline"
      >
        Expiră curând
      </Badge>
    );
  }
  return (
    <Badge
      className="border-green-500 text-green-600 bg-green-50"
      variant="outline"
    >
      Valid
    </Badge>
  );
}

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

const emptyDocForm = {
  type: "" as EmployeeDocument["type"] | "",
  name: "",
  expiryDate: "",
};

type Props =
  | { mode: "add"; onAdd: () => void }
  | {
      mode: "edit";
      employee: Employee;
      onEdit: (employee: Employee) => void;
      onUpdate?: (updated: Employee) => void;
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

  const department = useWatch({ control: form.control, name: "department" });

  // Documents state (edit mode only)
  const [documents, setDocuments] = React.useState<EmployeeDocument[]>(
    employee?.documents ?? [],
  );
  const [showDocForm, setShowDocForm] = React.useState(false);
  const [editingDocId, setEditingDocId] = React.useState<string | null>(null);
  const [docForm, setDocForm] = React.useState(emptyDocForm);
  const [docDate, setDocDate] = React.useState<Date | undefined>(undefined);

  React.useEffect(() => {
    if (open && isEdit) setDocuments(employee!.documents ?? []);
  }, [open, employee, isEdit]);

  const handleDocAdd = () => {
    setEditingDocId(null);
    setDocForm(emptyDocForm);
    setDocDate(undefined);
    setShowDocForm(true);
  };

  const handleDocEdit = (doc: EmployeeDocument) => {
    setEditingDocId(doc.id);
    setDocForm({
      type: doc.type,
      name: doc.name,
      expiryDate: doc.expiryDate ?? "",
    });
    setDocDate(doc.expiryDate ? new Date(doc.expiryDate) : undefined);
    setShowDocForm(true);
  };

  const handleDocDelete = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const handleDocSave = () => {
    if (!docForm.type || !docForm.name.trim()) return;
    let updated: EmployeeDocument[];
    if (editingDocId) {
      updated = documents.map((d) =>
        d.id === editingDocId
          ? {
              ...d,
              type: docForm.type as EmployeeDocument["type"],
              name: docForm.name.trim(),
              expiryDate: docForm.expiryDate || undefined,
            }
          : d,
      );
    } else {
      const newDoc: EmployeeDocument = {
        id: generateId(),
        type: docForm.type as EmployeeDocument["type"],
        name: docForm.name.trim(),
        expiryDate: docForm.expiryDate || undefined,
      };
      updated = [...documents, newDoc];
    }
    setDocuments(updated);
    setShowDocForm(false);
    setEditingDocId(null);
    setDocForm(emptyDocForm);
    setDocDate(undefined);
  };

  const handleDocCancel = () => {
    setShowDocForm(false);
    setEditingDocId(null);
    setDocForm(emptyDocForm);
    setDocDate(undefined);
  };

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) {
      if (!isEdit) {
        form.reset();
        setSelectedDate(undefined);
      }
      setShowDocForm(false);
      setEditingDocId(null);
      setDocForm(emptyDocForm);
      setDocDate(undefined);
    }
  };

  const handleSubmit = (values: EmployeeFormValues) => {
    if (props.mode === "edit") {
      props.onEdit({ ...props.employee, ...values, documents });
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

              <TabsContent
                value="personal"
                className="space-y-3 mt-0 min-h-[340px]"
              >
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
              </TabsContent>

              <TabsContent
                value="documents"
                className="space-y-2 mt-0 min-h-[340px]"
              >
                {documents.length === 0 && !showDocForm ? (
                  <p className="text-xs text-muted-foreground py-1">
                    Niciun document adăugat.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-[260px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded border px-2 py-1.5"
                      >
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {TYPE_LABELS[doc.type]}
                        </Badge>
                        <span className="flex-1 min-w-0 text-xs truncate">
                          {doc.name}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {doc.expiryDate ?? "—"}
                        </span>
                        {getExpiryBadge(doc.expiryDate)}
                        <div className="flex gap-1 ml-auto shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleDocEdit(doc)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => handleDocDelete(doc.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {showDocForm && (
                  <div className="space-y-2 border rounded p-2">
                    <Select
                      value={docForm.type}
                      onValueChange={(v) =>
                        setDocForm((f) => ({
                          ...f,
                          type: v as EmployeeDocument["type"],
                        }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Tip document" />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          Object.entries(TYPE_LABELS) as [
                            EmployeeDocument["type"],
                            string,
                          ][]
                        ).map(([val, label]) => (
                          <SelectItem key={val} value={val}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Nume document"
                      value={docForm.name}
                      onChange={(e) =>
                        setDocForm((f) => ({ ...f, name: e.target.value }))
                      }
                    />
                    <ExpiryDatePicker
                      selected={docDate}
                      onSelect={(date) => {
                        setDocDate(date);
                        setDocForm((f) => ({
                          ...f,
                          expiryDate: date
                            ? date.toISOString().slice(0, 10)
                            : "",
                        }));
                      }}
                      placeholder="Data expirare"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDocCancel}
                      >
                        Renunță
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={!docForm.type || !docForm.name.trim()}
                        onClick={handleDocSave}
                      >
                        {editingDocId
                          ? "Actualizează document"
                          : "Adaugă document"}
                      </Button>
                    </div>
                  </div>
                )}
                {!showDocForm && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDocAdd}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Adaugă document
                  </Button>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-3">
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
