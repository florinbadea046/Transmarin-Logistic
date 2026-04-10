import * as React from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Check, ChevronsUpDown, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { addItem, updateItem, generateId } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Employee, Training } from "@/modules/hr/types";
import { useHrAuditLog } from "@/hooks/use-hr-audit-log";
import { toast } from "sonner";
import {
  makeTrainingSchema,
  type TrainingFormValues,
} from "./trainings-schema";

interface TrainingDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employees: Employee[];
  training?: Training;
  onSaved: () => void;
}

export function TrainingDialog({
  open,
  onOpenChange,
  employees,
  training,
  onSaved,
}: TrainingDialogProps) {
  const { t } = useTranslation();
  const { log } = useHrAuditLog();
  const isEdit = !!training;

  const schema = React.useMemo(() => makeTrainingSchema(t), [t]);
  const resolver = React.useMemo(
    () => zodResolver(schema) as Resolver<TrainingFormValues>,
    [schema],
  );

  const form = useForm<TrainingFormValues>({
    resolver,
    defaultValues: {
      title: "",
      type: "intern",
      date: "",
      durationHours: 1,
      trainer: "",
      participantIds: [],
      status: "planificat",
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        title: training?.title ?? "",
        type: training?.type ?? "intern",
        date: training?.date ?? "",
        durationHours: training?.durationHours ?? 1,
        trainer: training?.trainer ?? "",
        participantIds: training?.participantIds ?? [],
        status: training?.status ?? "planificat",
      });
    }
    // form is stable across renders in react-hook-form; excluded to avoid spurious re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, training]);

  const handleSubmit = (values: TrainingFormValues) => {
    if (isEdit && training) {
      const updated: Training = {
        ...training,
        ...values,
      };
      updateItem<Training>(
        STORAGE_KEYS.trainings,
        (tr) => tr.id === training.id,
        () => updated,
      );
      log({
        action: "update",
        entity: "training",
        entityId: training.id,
        entityLabel: values.title,
        details: `${values.type} — ${values.status}`,
      });
      toast.success(t("trainings.toast.updated"));
    } else {
      const newId = generateId();
      const newTraining: Training = {
        id: newId,
        ...values,
        issuedCertificates: [],
      };
      addItem<Training>(STORAGE_KEYS.trainings, newTraining);
      log({
        action: "create",
        entity: "training",
        entityId: newId,
        entityLabel: values.title,
        details: `${values.type} — ${values.status}`,
      });
      toast.success(t("trainings.toast.created"));
    }
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">
            {isEdit
              ? t("trainings.dialog.editTitle")
              : t("trainings.dialog.addTitle")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
          {/* Title */}
          <div className="space-y-1">
            <Label htmlFor="title">{t("trainings.fields.title")}</Label>
            <Input
              id="title"
              placeholder={t("trainings.fields.titlePlaceholder")}
              {...form.register("title")}
            />
            {form.formState.errors.title && (
              <p className="text-xs text-red-500">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Type */}
            <div className="space-y-1">
              <Label>{t("trainings.fields.type")}</Label>
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="intern">
                        {t("trainings.type.intern")}
                      </SelectItem>
                      <SelectItem value="extern">
                        {t("trainings.type.extern")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.type && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.type.message}
                </p>
              )}
            </div>

            {/* Status */}
            <div className="space-y-1">
              <Label>{t("trainings.fields.status")}</Label>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planificat">
                        {t("trainings.status.planificat")}
                      </SelectItem>
                      <SelectItem value="in_curs">
                        {t("trainings.status.in_curs")}
                      </SelectItem>
                      <SelectItem value="finalizat">
                        {t("trainings.status.finalizat")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.status && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.status.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Date */}
            <div className="space-y-1">
              <Label htmlFor="date">{t("trainings.fields.date")}</Label>
              <Input id="date" type="date" {...form.register("date")} />
              {form.formState.errors.date && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.date.message}
                </p>
              )}
            </div>

            {/* Duration */}
            <div className="space-y-1">
              <Label htmlFor="durationHours">
                {t("trainings.fields.duration")}
              </Label>
              <Input
                id="durationHours"
                type="number"
                min={0.5}
                step={0.5}
                {...form.register("durationHours")}
              />
              {form.formState.errors.durationHours && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.durationHours.message}
                </p>
              )}
            </div>
          </div>

          {/* Trainer */}
          <div className="space-y-1">
            <Label htmlFor="trainer">{t("trainings.fields.trainer")}</Label>
            <Input
              id="trainer"
              placeholder={t("trainings.fields.trainerPlaceholder")}
              {...form.register("trainer")}
            />
            {form.formState.errors.trainer && (
              <p className="text-xs text-red-500">
                {form.formState.errors.trainer.message}
              </p>
            )}
          </div>

          {/* Participants multi-select */}
          <div className="space-y-1">
            <Label>{t("trainings.fields.participants")}</Label>
            <Controller
              control={form.control}
              name="participantIds"
              render={({ field }) => (
                <ParticipantsMultiSelect
                  employees={employees}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            {form.formState.errors.participantIds && (
              <p className="text-xs text-red-500">
                {form.formState.errors.participantIds.message}
              </p>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                {t("trainings.actions.cancel")}
              </Button>
            </DialogClose>
            <Button type="submit" size="sm">
              {t("trainings.actions.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Multi-select participants (Popover + Command) ────────

interface MultiSelectProps {
  employees: Employee[];
  value: string[];
  onChange: (v: string[]) => void;
}

function ParticipantsMultiSelect({
  employees,
  value,
  onChange,
}: MultiSelectProps) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const remove = (id: string) => onChange(value.filter((v) => v !== id));

  const selected = employees.filter((e) => value.includes(e.id));

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {value.length === 0
              ? t("trainings.fields.participantsPlaceholder")
              : t("trainings.fields.participantsSelected", {
                  count: value.length,
                })}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder={t("trainings.fields.searchEmployee")} />
            <CommandList>
              <CommandEmpty>{t("trainings.fields.noEmployee")}</CommandEmpty>
              <CommandGroup>
                {employees.map((emp) => {
                  const checked = value.includes(emp.id);
                  return (
                    <CommandItem
                      key={emp.id}
                      value={emp.name}
                      onSelect={() => toggle(emp.id)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          checked ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="flex-1">{emp.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {emp.department}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((emp) => (
            <Badge key={emp.id} variant="secondary" className="gap-1 pr-1">
              {emp.name}
              <button
                type="button"
                onClick={() => remove(emp.id)}
                className="ml-0.5 rounded-sm hover:bg-muted-foreground/20 p-0.5"
                aria-label={`Remove ${emp.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
