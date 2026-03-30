import * as React from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { format } from "date-fns";
import { X, Plus, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

function makeOrderSchema(t: (k: string) => string) {
  return z.object({
    clientName: z.string().trim().min(1, t("orders.validation.clientRequired")),
    origin: z.string().trim().min(1, t("orders.validation.originRequired")),
    destination: z
      .string()
      .trim()
      .min(1, t("orders.validation.destinationRequired")),
    date: z.date().refine((d) => d instanceof Date && !isNaN(d.getTime()), {
      message: t("orders.validation.dateRequired"),
    }),
    weight: z
      .union([z.string(), z.number()])
      .transform((v) => (typeof v === "string" ? Number(v) : v))
      .refine((n) => typeof n === "number" && Number.isFinite(n), {
        message: t("orders.validation.weightRequired"),
      })
      .refine((n) => n > 0, {
        message: t("orders.validation.weightPositive"),
      }),
    notes: z.string().trim().optional(),
    stops: z.array(z.string()).optional(),
  });
}

export type OrderForm = z.infer<ReturnType<typeof makeOrderSchema>>;

const EMPTY_FORM: OrderForm = {
  clientName: "",
  origin: "",
  destination: "",
  date: new Date(),
  weight: 1,
  notes: "",
  stops: [],
};

export interface OrderFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  initialValues?: OrderForm;
  onSave: (values: OrderForm) => string | null;
  triggerButton?: React.ReactNode;
}

export function OrderFormDialog({
  open,
  onOpenChange,
  title,
  initialValues,
  onSave,
  triggerButton,
}: OrderFormDialogProps) {
  const { t } = useTranslation();
  const [dateOpen, setDateOpen] = React.useState(false);
  const [form, setForm] = React.useState<OrderForm>(
    initialValues ?? EMPTY_FORM,
  );
  const [errors, setErrors] = React.useState<
    Partial<Record<keyof OrderForm, string>>
  >({});
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setForm(initialValues ?? EMPTY_FORM);
      setErrors({});
      setFormError(null);
      setDateOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleSubmit() {
    setErrors({});
    setFormError(null);
    const parsed = makeOrderSchema(t).safeParse(form);
    if (!parsed.success) {
      const nextErrors: Partial<Record<keyof OrderForm, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof OrderForm | undefined;
        if (key && !nextErrors[key]) nextErrors[key] = issue.message;
      }
      setErrors(nextErrors);
      return;
    }
    const err = onSave(parsed.data);
    if (err) {
      setFormError(err);
      return;
    }
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setDateOpen(false);
      }}
    >
      {triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{title}</DialogDescription>
        </DialogHeader>

        {formError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        )}

        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="clientName">{t("orders.fields.client")} *</Label>
              <Input
                id="clientName"
                value={form.clientName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, clientName: e.target.value }))
                }
                placeholder={t("orders.placeholders.client")}
              />
              {errors.clientName && (
                <p className="text-xs text-destructive">{errors.clientName}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="weight">{t("orders.fields.weight")} *</Label>
              <Input
                id="weight"
                inputMode="decimal"
                type="number"
                step="0.01"
                min={0}
                value={form.weight as any}
                onChange={(e) =>
                  setForm((p) => ({ ...p, weight: e.target.value as any }))
                }
                placeholder={t("orders.placeholders.weight")}
              />
              {errors.weight && (
                <p className="text-xs text-destructive">{errors.weight}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="origin">{t("orders.fields.origin")} *</Label>
              <Input
                id="origin"
                value={form.origin}
                onChange={(e) =>
                  setForm((p) => ({ ...p, origin: e.target.value }))
                }
                placeholder={t("orders.placeholders.origin")}
              />
              {errors.origin && (
                <p className="text-xs text-destructive">{errors.origin}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="destination">
                {t("orders.fields.destination")} *
              </Label>
              <Input
                id="destination"
                value={form.destination}
                onChange={(e) =>
                  setForm((p) => ({ ...p, destination: e.target.value }))
                }
                placeholder={t("orders.placeholders.destination")}
              />
              {errors.destination && (
                <p className="text-xs text-destructive">{errors.destination}</p>
              )}
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>{t("orders.fields.date")} *</Label>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.date && "text-muted-foreground",
                    )}
                  >
                    {form.date ? (
                      <span className="tabular-nums">
                        {format(form.date, "yyyy-MM-dd")}
                      </span>
                    ) : (
                      t("orders.placeholders.selectDate")
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  align="center"
                  avoidCollisions={false}
                  className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 p-0 overflow-hidden rounded-xl border bg-popover shadow-2xl w-[260px]"
                >
                  <Calendar
                    mode="single"
                    selected={form.date}
                    onSelect={(d) => {
                      if (!d) return;
                      setForm((p) => ({ ...p, date: d }));
                      setDateOpen(false);
                    }}
                    initialFocus
                    fixedWeeks
                    style={{ ["--cell-size" as any]: "24px" }}
                    className="p-1 text-xs w-full"
                  />
                </PopoverContent>
              </Popover>
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date}</p>
              )}
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="notes">{t("orders.fields.notes")}</Label>
              <Textarea
                id="notes"
                value={form.notes ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder={t("orders.placeholders.notes")}
                className="min-h-[100px]"
              />
              {errors.notes && (
                <p className="text-xs text-destructive">{errors.notes}</p>
              )}
            </div>

            {/* Stops section */}
            <div className="grid gap-2 sm:col-span-2">
              <Label>{t("orders.fields.stops")}</Label>
              <div className="space-y-2">
                {(form.stops ?? []).map((stop, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" />
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <Input
                      value={stop}
                      onChange={(e) => {
                        const next = [...(form.stops ?? [])];
                        next[idx] = e.target.value;
                        setForm((p) => ({ ...p, stops: next }));
                      }}
                      placeholder={t("orders.placeholders.stop")}
                      className="h-8"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const next = [...(form.stops ?? [])];
                          next.splice(idx + 1, 0, "");
                          setForm((p) => ({ ...p, stops: next }));
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 shrink-0"
                      onClick={() => {
                        const next = (form.stops ?? []).filter(
                          (_, i) => i !== idx,
                        );
                        setForm((p) => ({ ...p, stops: next }));
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1"
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      stops: [...(p.stops ?? []), ""],
                    }))
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("orders.stops.add")}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("orders.cancel")}
          </Button>
          <Button type="button" onClick={handleSubmit}>
            {t("orders.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
