import * as React from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  addItem,
  getCollection,
  updateItem,
  generateId,
} from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Candidate, CandidateStatus } from "@/modules/hr/types";
import { CANDIDATE_STATUSES } from "@/modules/hr/types";
import { useHrAuditLog } from "@/hooks/use-hr-audit-log";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  makeCandidateSchema,
  type CandidateFormValues,
} from "./recruitment-schema";

interface CandidateDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  candidate?: Candidate;
  defaultStatus?: CandidateStatus;
  onSaved: () => void;
}

export function CandidateDialog({
  open,
  onOpenChange,
  candidate,
  defaultStatus = "applied",
  onSaved,
}: CandidateDialogProps) {
  const { t, i18n } = useTranslation();
  const { log } = useHrAuditLog();
  const isEdit = !!candidate;

  const schema = React.useMemo(
    () => makeCandidateSchema(t),
    [t, i18n.language],
  );
  const resolver = React.useMemo(
    () => zodResolver(schema) as Resolver<CandidateFormValues>,
    [schema],
  );

  const today = new Date().toISOString().slice(0, 10);

  const form = useForm<CandidateFormValues>({
    resolver,
    defaultValues: {
      name: "",
      position: "",
      email: "",
      phone: "",
      applicationDate: today,
      rating: 3,
      notes: "",
      status: defaultStatus,
    },
  });

  React.useEffect(() => {
    if (!open) return;
    form.reset({
      name: candidate?.name ?? "",
      position: candidate?.position ?? "",
      email: candidate?.email ?? "",
      phone: candidate?.phone ?? "",
      applicationDate: candidate?.applicationDate ?? today,
      rating: candidate?.rating ?? 3,
      notes: candidate?.notes ?? "",
      status: candidate?.status ?? defaultStatus,
    });
  }, [open, candidate, defaultStatus]);

  const rating = form.watch("rating");

  const onSubmit = (values: CandidateFormValues) => {
    const trimmed: CandidateFormValues = {
      ...values,
      name: values.name.trim(),
      position: values.position.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
    };

    const existing = getCollection<Candidate>(STORAGE_KEYS.recruitment);
    const emailLc = trimmed.email.toLowerCase();
    const duplicate = existing.some(
      (c) =>
        c.email.toLowerCase() === emailLc &&
        (!isEdit || !candidate || c.id !== candidate.id),
    );
    if (duplicate) {
      toast.error(t("recruitment.duplicateEmail"));
      return;
    }

    if (isEdit && candidate) {
      updateItem<Candidate>(
        STORAGE_KEYS.recruitment,
        (c) => c.id === candidate.id,
        (c) => ({ ...c, ...trimmed }),
      );
      log({
        action: "update",
        entity: "candidate",
        entityId: candidate.id,
        entityLabel: values.name,
        details: `${values.position} — ${t(`recruitment.status.${values.status}`)}`,
        oldValue: {
          name: candidate.name,
          position: candidate.position,
          status: candidate.status,
          rating: candidate.rating,
        },
        newValue: {
          name: values.name,
          position: values.position,
          status: values.status,
          rating: values.rating,
        },
      });
      toast.success(t("recruitment.toast.updated"));
    } else {
      const payload: Candidate = {
        ...trimmed,
        notes: trimmed.notes ?? "",
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      addItem<Candidate>(STORAGE_KEYS.recruitment, payload);
      log({
        action: "create",
        entity: "candidate",
        entityId: payload.id,
        entityLabel: payload.name,
        details: `${payload.position} — ${t(`recruitment.status.${payload.status}`)}`,
        newValue: {
          name: payload.name,
          position: payload.position,
          email: payload.email,
          status: payload.status,
        },
      });
      toast.success(t("recruitment.toast.created"));
    }
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("recruitment.dialog.editTitle")
              : t("recruitment.dialog.addTitle")}
          </DialogTitle>
        </DialogHeader>

        <form
          className="space-y-3"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
        >
          <div>
            <Input
              placeholder={t("recruitment.fields.name")}
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-red-500 mt-1">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div>
            <Input
              placeholder={t("recruitment.fields.position")}
              {...form.register("position")}
            />
            {form.formState.errors.position && (
              <p className="text-xs text-red-500 mt-1">
                {form.formState.errors.position.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Input
                type="email"
                placeholder={t("recruitment.fields.email")}
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-red-500 mt-1">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
            <div>
              <Input
                placeholder={t("recruitment.fields.phone")}
                {...form.register("phone")}
              />
              {form.formState.errors.phone && (
                <p className="text-xs text-red-500 mt-1">
                  {form.formState.errors.phone.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                {t("recruitment.fields.applicationDate")}
              </label>
              <Input type="date" {...form.register("applicationDate")} />
              {form.formState.errors.applicationDate && (
                <p className="text-xs text-red-500 mt-1">
                  {form.formState.errors.applicationDate.message}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                {t("recruitment.fields.status")}
              </label>
              <Select
                value={form.watch("status")}
                onValueChange={(v) =>
                  form.setValue("status", v as CandidateStatus, {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CANDIDATE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`recruitment.status.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              {t("recruitment.fields.rating")}
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() =>
                    form.setValue("rating", n, { shouldValidate: true })
                  }
                  className="p-1"
                  aria-label={`${n}`}
                >
                  <Star
                    className={cn(
                      "h-5 w-5",
                      n <= (rating ?? 0)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground",
                    )}
                  />
                </button>
              ))}
            </div>
            {form.formState.errors.rating && (
              <p className="text-xs text-red-500 mt-1">
                {form.formState.errors.rating.message}
              </p>
            )}
          </div>

          <div>
            <Textarea
              placeholder={t("recruitment.fields.notes")}
              rows={3}
              {...form.register("notes")}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
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
