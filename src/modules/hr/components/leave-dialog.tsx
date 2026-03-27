import * as React from "react";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarDropdown } from "./calendar-dropdown";
import { addItem, generateId, getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import { useHrAuditLog } from "@/hooks/use-hr-audit-log";
import type { LeaveRequest, Employee } from "@/modules/hr/types";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

// ── Schema ──────────────────────────────────────────────────
function makeLeaveSchema(t: (key: string) => string) {
  return z
    .object({
      employeeId: z.string().min(1, t("leaves.validation.employeeRequired")),
      type: z.enum(["annual", "sick", "unpaid", "other"] as const),
      status: z.enum(["pending", "approved", "rejected"] as const).optional(),
      startDate: z.string().min(1, t("leaves.validation.startDateRequired")),
      endDate: z.string().min(1, t("leaves.validation.endDateRequired")),
      reason: z.string().optional(),
    })
    .refine((d) => d.endDate >= d.startDate, {
      message: t("leaves.validation.endDateAfterStart"),
      path: ["endDate"],
    });
}

type LeaveFormValues = z.infer<ReturnType<typeof makeLeaveSchema>>;

// ── Props ────────────────────────────────────────────────────
type Props =
  | { mode: "add"; onAdd: () => void }
  | {
      mode: "edit";
      leave: LeaveRequest;
      onEdit: (leave: LeaveRequest) => void;
      open?: boolean;
      onOpenChange?: (v: boolean) => void;
    };

// ── Helper: calculate calendar days ─────────────────────────
function calcDays(start: string, end: string): number {
  if (!start || !end || end < start) return 0;
  return differenceInCalendarDays(parseISO(end), parseISO(start)) + 1;
}

// ── Helper: check overlap ────────────────────────────────────
function hasOverlap(
  employeeId: string,
  startDate: string,
  endDate: string,
  excludeId?: string,
): boolean {
  const existing = getCollection<LeaveRequest>(STORAGE_KEYS.leaveRequests);
  return existing.some(
    (lr) =>
      lr.id !== excludeId &&
      lr.employeeId === employeeId &&
      lr.status !== "rejected" &&
      lr.startDate <= endDate &&
      lr.endDate >= startDate,
  );
}

// ── DatePicker ───────────────────────────────────────────────
function DatePickerField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const selected = value ? parseISO(value) : undefined;
  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            data-empty={!value}
            className="w-full justify-start text-start font-normal data-[empty=true]:text-muted-foreground"
          >
            {selected ? format(selected, "d MMM yyyy") : <span>{label}</span>}
            <CalendarIcon className="ms-auto h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            selected={selected}
            onSelect={(date) =>
              onChange(date ? format(date, "yyyy-MM-dd") : "")
            }
            startMonth={new Date(1000, 0)}
            endMonth={new Date(3000, 11)}
            components={{ Dropdown: CalendarDropdown }}
          />
        </PopoverContent>
      </Popover>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </>
  );
}

// ── Dialog ───────────────────────────────────────────────────
export default function LeaveDialog(props: Props) {
  const { t } = useTranslation();
  const isEdit = props.mode === "edit";
  const leave = isEdit ? props.leave : undefined;
  const externalOpen = isEdit ? props.open : undefined;
  const externalOnOpenChange = isEdit ? props.onOpenChange : undefined;

  const { log } = useHrAuditLog();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange ?? setInternalOpen;
  const showTrigger = externalOpen === undefined;

  const employees = React.useMemo(
    () => getCollection<Employee>(STORAGE_KEYS.employees),
    [],
  );

  const leaveSchema = React.useMemo(() => makeLeaveSchema(t), [t]);

  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveSchema) as Resolver<LeaveFormValues>,
    defaultValues: {
      employeeId: leave?.employeeId ?? "",
      type: leave?.type ?? "annual",
      status: leave?.status ?? "pending",
      startDate: leave?.startDate ?? "",
      endDate: leave?.endDate ?? "",
      reason: leave?.reason ?? "",
    },
  });

  const [employeeId, type, status, startDate, endDate] = useWatch({
    control: form.control,
    name: ["employeeId", "type", "status", "startDate", "endDate"],
  });
  const days = calcDays(startDate, endDate);

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val && !isEdit) form.reset();
  };

  const handleSubmit = (values: LeaveFormValues) => {
    const overlap = hasOverlap(
      values.employeeId,
      values.startDate,
      values.endDate,
      leave?.id,
    );
    if (overlap) {
      toast.error(t("leaves.toast.overlap"));
      return;
    }

    const empName = employees.find((e) => e.id === values.employeeId)?.name ?? values.employeeId;
    const leaveTypeLabel = t(`leaves.types.${values.type}`);
    if (props.mode === "edit") {
      const oldStatus = props.leave.status;
      const newStatus = values.status ?? props.leave.status;
      const action =
        newStatus === "approved" && oldStatus !== "approved" ? "approve" :
        newStatus === "rejected" && oldStatus !== "rejected" ? "reject" :
        "update";
      props.onEdit({
        ...props.leave,
        ...values,
        status: newStatus,
        days,
      });
      log({
        action,
        entity: "leave",
        entityId: props.leave.id,
        entityLabel: empName,
        details: `${leaveTypeLabel}, ${values.startDate} – ${values.endDate} (${days} zile)`,
        oldValue: { status: oldStatus },
        newValue: { status: newStatus },
      });
    } else {
      const newId = generateId();
      addItem<LeaveRequest>(STORAGE_KEYS.leaveRequests, {
        ...values,
        id: newId,
        days,
        status: "pending",
      });
      log({
        action: "create",
        entity: "leave",
        entityId: newId,
        entityLabel: empName,
        details: `${leaveTypeLabel}, ${values.startDate} – ${values.endDate} (${days} zile)`,
        newValue: { type: leaveTypeLabel, startDate: values.startDate, endDate: values.endDate, days, ...(values.reason ? { reason: values.reason } : {}) },
      });
      props.onAdd();
      form.reset();
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button variant="default">{t("leaves.actions.add")}</Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md overflow-y-auto max-h-[90dvh]">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("leaves.dialog.editTitle")
              : t("leaves.dialog.addTitle")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="space-y-3">
            <Select
              value={employeeId}
              onValueChange={(v) =>
                form.setValue("employeeId", v, { shouldValidate: true })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={t("leaves.placeholders.selectEmployee")}
                />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.employeeId && (
              <span className="text-xs text-red-500">
                {form.formState.errors.employeeId.message}
              </span>
            )}

            <Select
              value={type}
              onValueChange={(v) =>
                form.setValue("type", v as LeaveFormValues["type"], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("leaves.placeholders.leaveType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="annual">
                  {t("leaves.types.annual")}
                </SelectItem>
                <SelectItem value="sick">{t("leaves.types.sick")}</SelectItem>
                <SelectItem value="other">{t("leaves.types.other")}</SelectItem>
                <SelectItem value="unpaid">
                  {t("leaves.types.unpaid")}
                </SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.type && (
              <span className="text-xs text-red-500">
                {form.formState.errors.type.message}
              </span>
            )}

            {isEdit && (
              <Select
                value={status ?? "pending"}
                onValueChange={(v) =>
                  form.setValue("status", v as LeaveFormValues["status"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">În așteptare</SelectItem>
                  <SelectItem value="approved">Aprobat</SelectItem>
                  <SelectItem value="rejected">Respins</SelectItem>
                </SelectContent>
              </Select>
            )}

            <DatePickerField
              label="Data de start"
              value={startDate}
              onChange={(v) =>
                form.setValue("startDate", v, { shouldValidate: true })
              }
              error={form.formState.errors.startDate?.message}
            />

            <DatePickerField
              label="Data de sfârșit"
              value={endDate}
              onChange={(v) =>
                form.setValue("endDate", v, { shouldValidate: true })
              }
              error={form.formState.errors.endDate?.message}
            />

            {days > 0 && (
              <p className="text-sm text-muted-foreground">
                Număr zile:{" "}
                <span className="font-medium text-foreground">{days}</span>
              </p>
            )}

            <Input
              placeholder="Motiv (opțional)"
              {...form.register("reason")}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Anulează
              </Button>
            </DialogClose>
            <Button type="submit">Salvează</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
