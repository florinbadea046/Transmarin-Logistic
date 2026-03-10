import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { EmployeeDocument } from "@/modules/hr/types";

const TYPE_LABELS: Record<EmployeeDocument["type"], string> = {
  license: "Permis",
  tachograph: "Tahograf",
  adr: "ADR",
  medical: "Medical",
  contract: "Contract",
  other: "Altele",
};

function getExpiryBadge(expiryDate?: string) {
  if (!expiryDate) return <Badge variant="secondary">Fără expirare</Badge>;
  const today = new Date().toISOString().slice(0, 10);
  if (expiryDate < today) return <Badge variant="destructive">Expirat</Badge>;
  const days = Math.floor(
    (new Date(expiryDate).getTime() - new Date(today).getTime()) / 86400000,
  );
  if (days <= 30) {
    return (
      <Badge className="border-yellow-500 text-yellow-600 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-400" variant="outline">
        Expiră curând
      </Badge>
    );
  }
  return (
    <Badge className="border-green-500 text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400" variant="outline">
      Valid
    </Badge>
  );
}

const emptyDocForm = {
  type: "" as EmployeeDocument["type"] | "",
  name: "",
  expiryDate: "",
};

interface Props {
  documents: EmployeeDocument[];
  onChange: (docs: EmployeeDocument[]) => void;
}

export function DocumentsTab({ documents, onChange }: Props) {
  const [showDocForm, setShowDocForm] = React.useState(false);
  const [editingDocId, setEditingDocId] = React.useState<string | null>(null);
  const [docForm, setDocForm] = React.useState(emptyDocForm);
  const [docDate, setDocDate] = React.useState<Date | undefined>(undefined);

  const handleDocAdd = () => {
    setEditingDocId(null);
    setDocForm(emptyDocForm);
    setDocDate(undefined);
    setShowDocForm(true);
  };

  const handleDocEdit = (doc: EmployeeDocument) => {
    setEditingDocId(doc.id);
    setDocForm({ type: doc.type, name: doc.name, expiryDate: doc.expiryDate ?? "" });
    setDocDate(doc.expiryDate ? new Date(doc.expiryDate) : undefined);
    setShowDocForm(true);
  };

  const handleDocDelete = (id: string) => {
    onChange(documents.filter((d) => d.id !== id));
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
      updated = [
        ...documents,
        {
          id: generateId(),
          type: docForm.type as EmployeeDocument["type"],
          name: docForm.name.trim(),
          expiryDate: docForm.expiryDate || undefined,
        },
      ];
    }
    onChange(updated);
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

  return (
    <div className="space-y-2">
      {documents.length === 0 && !showDocForm ? (
        <p className="text-xs text-muted-foreground py-1">Niciun document adăugat.</p>
      ) : (
        <div className="space-y-1.5 max-h-[260px] overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded border px-2 py-1.5"
            >
              <Badge variant="secondary" className="shrink-0 text-xs">
                {TYPE_LABELS[doc.type]}
              </Badge>
              <span className="flex-1 min-w-0 text-xs truncate">{doc.name}</span>
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
              setDocForm((f) => ({ ...f, type: v as EmployeeDocument["type"] }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Tip document" />
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
            placeholder="Nume document"
            value={docForm.name}
            onChange={(e) => setDocForm((f) => ({ ...f, name: e.target.value }))}
          />
          <ExpiryDatePicker
            selected={docDate}
            onSelect={(date) => {
              setDocDate(date);
              setDocForm((f) => ({
                ...f,
                expiryDate: date ? date.toISOString().slice(0, 10) : "",
              }));
            }}
            placeholder="Data expirare"
          />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={handleDocCancel}>
              Renunță
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!docForm.type || !docForm.name.trim()}
              onClick={handleDocSave}
            >
              {editingDocId ? "Actualizează document" : "Adaugă document"}
            </Button>
          </div>
        </div>
      )}
      {!showDocForm && (
        <Button type="button" variant="outline" size="sm" onClick={handleDocAdd}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Adaugă document
        </Button>
      )}
    </div>
  );
}
