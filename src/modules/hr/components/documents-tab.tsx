import * as React from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Plus } from "lucide-react";
import { ExpiryDatePicker } from "./expiry-date-picker";
import { generateId } from "@/utils/local-storage";
import { getHRSettings } from "../utils/get-hr-settings";
import type { EmployeeDocument } from "@/modules/hr/types";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

function getDocTypeLabels(t: TFunction): Record<EmployeeDocument["type"], string> {
  return {
    contract: t("documents.types.contract"),
    license: t("documents.types.license"),
    medical: t("documents.types.medical"),
    certificate: t("documents.types.certificate"),
    tachograph: t("documents.types.tachograph"),
    adr: t("documents.types.adr"),
    other: t("documents.types.other"),
  };
}

// Parse a YYYY-MM-DD string as a local date (midnight in the user's timezone)
function parseLocalYmdDate(dateStr: string): Date {
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1; // JS months are 0-based
  const day = Number(dayStr);
  return new Date(year, monthIndex, day);
}

function getExpiryBadge(t: TFunction, expiryDate?: string) {
  if (!expiryDate) return <Badge variant="secondary">{t("documents.noExpiry")}</Badge>;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expiry = parseLocalYmdDate(expiryDate);

  if (expiry.getTime() < today.getTime()) {
    return <Badge variant="destructive">{t("documents.expired")}</Badge>;
  }

  const days = Math.floor(
    (expiry.getTime() - today.getTime()) / 86400000,
  );

  if (days <= 30) {
    return (
      <Badge className="border-yellow-500 text-yellow-600 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-400" variant="outline">
        {t("documents.expiresSoon")}
      </Badge>
    );
  }
  return (
    <Badge className="border-green-500 text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400" variant="outline">
      {t("documents.valid")}
    </Badge>
  );
}

const emptyDocForm = {
  type: "" as EmployeeDocument["type"] | "",
  name: "",
  documentNumber: "",
  issueDate: "",
  expiryDate: "",
  notes: "",
};

interface Props {
  documents: EmployeeDocument[];
  onChange: (docs: EmployeeDocument[]) => void;
}

export function DocumentsTab({ documents, onChange }: Props) {
  const { t } = useTranslation();
  const TYPE_LABELS = React.useMemo(() => getDocTypeLabels(t), [t]);
  const docNumberFormat = React.useMemo(() => getHRSettings().documentNumberFormat, []);
  const [showDocForm, setShowDocForm] = React.useState(false);
  const [editingDocId, setEditingDocId] = React.useState<string | null>(null);
  const [docForm, setDocForm] = React.useState(emptyDocForm);
  const [issueDate, setIssueDate] = React.useState<Date | undefined>(undefined);
  const [docDate, setDocDate] = React.useState<Date | undefined>(undefined);

  const handleDocAdd = () => {
    setEditingDocId(null);
    setDocForm(emptyDocForm);
    setIssueDate(undefined);
    setDocDate(undefined);
    setShowDocForm(true);
  };

  const handleDocEdit = (doc: EmployeeDocument) => {
    setEditingDocId(doc.id);
    setDocForm({
      type: doc.type,
      name: doc.name,
      documentNumber: doc.documentNumber ?? "",
      issueDate: doc.issueDate ?? "",
      expiryDate: doc.expiryDate ?? "",
      notes: doc.notes ?? "",
    });
    setIssueDate(doc.issueDate ? parseLocalYmdDate(doc.issueDate) : undefined);
    setDocDate(doc.expiryDate ? parseLocalYmdDate(doc.expiryDate) : undefined);
    setShowDocForm(true);
  };

  const handleDocDelete = (id: string) => {
    onChange(documents.filter((d) => d.id !== id));
  };

  const handleDocSave = () => {
    const hasIdentifier =
      (docForm.name && docForm.name.trim().length > 0) ||
      (docForm.documentNumber && docForm.documentNumber.trim().length > 0);
    if (!docForm.type || !hasIdentifier) return;
    let updated: EmployeeDocument[];
    if (editingDocId) {
      updated = documents.map((d) =>
        d.id === editingDocId
          ? {
              ...d,
              type: docForm.type as EmployeeDocument["type"],
              name: docForm.name.trim(),
              documentNumber: docForm.documentNumber?.trim() || undefined,
              issueDate: docForm.issueDate || undefined,
              expiryDate: docForm.expiryDate || undefined,
              notes: docForm.notes?.trim() || undefined,
            }
          : d,
      );
    } else {
      updated = [
        ...documents,
        {
          id: generateId(),
          type: docForm.type as EmployeeDocument["type"],
          name: docForm.name.trim(),
          documentNumber: docForm.documentNumber?.trim() || undefined,
          issueDate: docForm.issueDate || undefined,
          expiryDate: docForm.expiryDate || undefined,
          notes: docForm.notes?.trim() || undefined,
        },
      ];
    }
    onChange(updated);
    setShowDocForm(false);
    setEditingDocId(null);
    setDocForm(emptyDocForm);
    setIssueDate(undefined);
    setDocDate(undefined);
  };

  const handleDocCancel = () => {
    setShowDocForm(false);
    setEditingDocId(null);
    setDocForm(emptyDocForm);
    setIssueDate(undefined);
    setDocDate(undefined);
  };

  return (
    <div className="space-y-2">
      {documents.length === 0 && !showDocForm ? (
        <p className="text-xs text-muted-foreground py-1">{t("documents.empty")}</p>
      ) : (
        <div className="space-y-1.5 max-h-[160px] sm:max-h-[175px] overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="rounded border px-2 py-1.5 space-y-0.5"
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {TYPE_LABELS[doc.type]}
                </Badge>
                <span className="flex-1 min-w-0 text-xs truncate">{doc.name || doc.documentNumber || "—"}</span>
                {getExpiryBadge(t, doc.expiryDate)}
                <div className="flex gap-1 ml-auto shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    aria-label={t("documents.editAriaLabel")}
                    onClick={() => handleDocEdit(doc)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    aria-label={t("documents.deleteAriaLabel")}
                    onClick={() => handleDocDelete(doc.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0 text-xs text-muted-foreground">
                {doc.documentNumber && <span>{t("documents.numberLabel")}: {doc.documentNumber}</span>}
                {doc.issueDate && <span>{t("documents.issuedLabel")}: {doc.issueDate}</span>}
                {doc.expiryDate && <span>{t("documents.expiresLabel")}: {doc.expiryDate}</span>}
                {doc.notes && <span className="italic">{doc.notes}</span>}
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
              setDocForm((f) => ({ ...f, type: v as EmployeeDocument["type"] }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("documents.typePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(TYPE_LABELS) as [EmployeeDocument["type"], string][]).map(
                ([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
          <Input
            placeholder={`Nr. document (ex: ${docNumberFormat})`}
            value={docForm.documentNumber}
            onChange={(e) => setDocForm((f) => ({ ...f, documentNumber: e.target.value }))}
          />
          <Input
            placeholder={t("documents.namePlaceholder")}
            value={docForm.name}
            onChange={(e) => setDocForm((f) => ({ ...f, name: e.target.value }))}
          />
          <ExpiryDatePicker
            selected={issueDate}
            onSelect={(date) => {
              setIssueDate(date);
              setDocForm((f) => ({
                ...f,
                issueDate: date ? format(date, "yyyy-MM-dd") : "",
              }));
            }}
            placeholder={t("documents.issueDatePlaceholder")}
          />
          <ExpiryDatePicker
            selected={docDate}
            onSelect={(date) => {
              setDocDate(date);
              setDocForm((f) => ({
                ...f,
                expiryDate: date ? format(date, "yyyy-MM-dd") : "",
              }));
            }}
            placeholder={t("documents.expiryDatePlaceholder")}
          />
          <Textarea
            placeholder={t("documents.notesPlaceholder")}
            value={docForm.notes}
            rows={2}
            onChange={(e) => setDocForm((f) => ({ ...f, notes: e.target.value }))}
          />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={handleDocCancel}>
              {t("documents.cancelButton")}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!docForm.type || (!docForm.name?.trim() && !docForm.documentNumber?.trim())}
              onClick={handleDocSave}
            >
              {editingDocId ? t("documents.updateButton") : t("documents.addButton")}
            </Button>
          </div>
        </div>
      )}
      {!showDocForm && (
        <Button type="button" variant="outline" size="sm" onClick={handleDocAdd}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          {t("documents.addDocumentButton")}
        </Button>
      )}
    </div>
  );
}
