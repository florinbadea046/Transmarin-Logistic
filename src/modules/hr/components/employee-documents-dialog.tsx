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
import { useTranslation } from "react-i18next";
import { useHrAuditLog } from "@/hooks/use-hr-audit-log";

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
  const { t } = useTranslation();
  const { log } = useHrAuditLog();

  const handleChange = (docs: EmployeeDocument[]) => {
    const oldCount = employee.documents.length;
    const newCount = docs.length;
    const action = newCount > oldCount ? "create" : newCount < oldCount ? "delete" : "update";
    const changedDoc = action === "delete"
      ? employee.documents.find((d) => !docs.some((nd) => nd.id === d.id))
      : action === "create"
        ? docs.find((d) => !employee.documents.some((od) => od.id === d.id))
        : docs.find((d) => {
            const old = employee.documents.find((od) => od.id === d.id);
            return old && JSON.stringify(old) !== JSON.stringify(d);
          });

    updateItem<Employee>(
      STORAGE_KEYS.employees,
      (e) => e.id === employee.id,
      (e) => ({ ...e, documents: docs }),
    );
    log({
      action,
      entity: "document",
      entityId: changedDoc?.id ?? employee.id,
      entityLabel: employee.name,
      details: changedDoc ? `${changedDoc.type}: ${changedDoc.name || changedDoc.documentNumber || "—"}` : undefined,
    });
    onUpdate({ ...employee, documents: docs });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t("employees.documents.title", { name: employee.name })}
          </DialogTitle>
        </DialogHeader>
        <DocumentsTab documents={employee.documents} onChange={handleChange} />
      </DialogContent>
    </Dialog>
  );
}
