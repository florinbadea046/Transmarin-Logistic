import * as React from "react";
import { useTranslation } from "react-i18next";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import { ro, enGB } from "date-fns/locale";
import { Calendar as CalendarIcon, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { addItem, generateId, getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import { useHrAuditLog } from "@/hooks/use-hr-audit-log";
import type { Employee, LeaveRequest } from "@/modules/hr/types";

function calcDays(start: string, end: string): number {
  if (!start || !end || end < start) return 0;
  return differenceInCalendarDays(parseISO(end), parseISO(start)) + 1;
}

function DatePicker({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith("en") ? enGB : ro;
  const selected = value ? parseISO(value) : undefined;
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            data-empty={!value}
            className="w-full justify-start font-normal data-[empty=true]:text-muted-foreground"
          >
            {selected
              ? format(selected, "d MMM yyyy", { locale })
              : placeholder}
            <CalendarIcon className="ms-auto h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(d) => onChange(d ? format(d, "yyyy-MM-dd") : "")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function NewLeaveDialog({
  employee,
  onCreated,
}: {
  employee: Employee;
  onCreated: () => void;
}) {
  const { t } = useTranslation();
  const { log } = useHrAuditLog();
  const [open, setOpen] = React.useState(false);
  const [type, setType] = React.useState<LeaveRequest["type"]>("annual");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [reason, setReason] = React.useState("");

  const days = calcDays(startDate, endDate);

  const reset = () => {
    setType("annual");
    setStartDate("");
    setEndDate("");
    setReason("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      toast.error(t("hr.selfService.leaves.toast.datesRequired"));
      return;
    }
    if (endDate < startDate) {
      toast.error(t("hr.selfService.leaves.toast.endBeforeStart"));
      return;
    }
    const existing = getCollection<LeaveRequest>(STORAGE_KEYS.leaveRequests);
    const overlap = existing.some(
      (lr) =>
        lr.employeeId === employee.id &&
        lr.status !== "rejected" &&
        lr.startDate <= endDate &&
        lr.endDate >= startDate,
    );
    if (overlap) {
      toast.error(t("hr.selfService.leaves.toast.overlap"));
      return;
    }

    const newId = generateId();
    addItem<LeaveRequest>(STORAGE_KEYS.leaveRequests, {
      id: newId,
      employeeId: employee.id,
      type,
      startDate,
      endDate,
      days,
      status: "pending",
      reason: reason || undefined,
    });
    const typeLabel = t(`hr.selfService.leaves.types.${type}`);
    log({
      action: "create",
      entity: "leave",
      entityId: newId,
      entityLabel: employee.name,
      details: t("hr.selfService.leaves.auditDetails", {
        type: typeLabel,
        startDate,
        endDate,
        days,
      }),
      newValue: {
        type,
        startDate,
        endDate,
        days,
        ...(reason ? { reason } : {}),
      },
    });
    toast.success(t("hr.selfService.leaves.toast.created"));
    reset();
    setOpen(false);
    onCreated();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          {t("hr.selfService.leaves.newRequest")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("hr.selfService.leaves.dialog.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("hr.selfService.leaves.dialog.typeLabel")}</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as LeaveRequest["type"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="annual">
                  {t("hr.selfService.leaves.dialog.typeOptions.annual")}
                </SelectItem>
                <SelectItem value="sick">
                  {t("hr.selfService.leaves.dialog.typeOptions.sick")}
                </SelectItem>
                <SelectItem value="unpaid">
                  {t("hr.selfService.leaves.dialog.typeOptions.unpaid")}
                </SelectItem>
                <SelectItem value="other">
                  {t("hr.selfService.leaves.dialog.typeOptions.other")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DatePicker
              label={t("hr.selfService.leaves.dialog.from")}
              value={startDate}
              onChange={setStartDate}
              placeholder={t("hr.selfService.leaves.dialog.pickDate")}
            />
            <DatePicker
              label={t("hr.selfService.leaves.dialog.to")}
              value={endDate}
              onChange={setEndDate}
              placeholder={t("hr.selfService.leaves.dialog.pickDate")}
            />
          </div>

          {days > 0 && (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              {t("hr.selfService.leaves.dialog.totalDays")}{" "}
              <span className="font-semibold">{days}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label>{t("hr.selfService.leaves.dialog.reasonLabel")}</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("hr.selfService.leaves.dialog.reasonPlaceholder")}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                {t("hr.selfService.leaves.dialog.cancel")}
              </Button>
            </DialogClose>
            <Button type="submit">
              {t("hr.selfService.leaves.dialog.submit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
