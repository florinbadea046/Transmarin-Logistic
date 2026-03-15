import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateItem } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Employee, EmployeeDocument } from "@/modules/hr/types";
import { DocumentsTab } from "./documents-tab";

interface Props {
  employee: Employee;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (updated: Employee) => void;
}

export function EmployeeDocumentsDialog({
  employee,
  open,
  onOpenChange,
  onUpdate,
}: Props) {
  const handleChange = (docs: EmployeeDocument[]) => {
    updateItem<Employee>(
      STORAGE_KEYS.employees,
      (e) => e.id === employee.id,
      (e) => ({ ...e, documents: docs }),
    );
    onUpdate({ ...employee, documents: docs });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Documente — {employee.name}</DialogTitle>
        </DialogHeader>
        <DocumentsTab
          documents={employee.documents}
          onChange={handleChange}
        />
      </DialogContent>
    </Dialog>
  );
}
