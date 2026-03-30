import * as React from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import type { Trip, Driver, Truck, Order } from "@/modules/transport/types";
import { addItem, updateItem, generateId } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";

type TripFormValues = {
  orderId: string;
  driverId: string;
  truckId: string;
  departureDate: string;
  estimatedArrivalDate: string;
  kmLoaded: number;
  kmEmpty: number;
  fuelCost: number;
  revenue: number;
  status: "planned" | "in_desfasurare" | "finalizata" | "anulata";
  unscheduled?: boolean;
};

function buildSchema(t: ReturnType<typeof useTranslation>["t"]) {
  return z
    .object({
      orderId: z.string().min(1, t("trips.validation.orderRequired")),
      driverId: z.string().min(1, t("trips.validation.driverRequired")),
      truckId: z.string().min(1, t("trips.validation.truckRequired")),
      departureDate: z.string().optional().default(""),
      estimatedArrivalDate: z.string().optional().default(""),
      kmLoaded: z.number().positive(t("trips.validation.kmLoadedPositive")),
      kmEmpty: z.number().positive(t("trips.validation.kmEmptyPositive")),
      fuelCost: z.number().min(0, t("trips.validation.fuelCostMin")),
      revenue: z.number().min(0, t("trips.validation.revenueMin")),
      status: z.enum(["planned", "in_desfasurare", "finalizata", "anulata"]),
    })
    .refine(
      (data) =>
        !data.departureDate ||
        !data.estimatedArrivalDate ||
        data.estimatedArrivalDate >= data.departureDate,
      {
        message: t("trips.validation.arrivalAfterDeparture"),
        path: ["estimatedArrivalDate"],
      },
    );
}

export interface TripFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTrip: Trip | null;
  orders: Order[];
  drivers: Driver[];
  trucks: Truck[];
  onSaved: () => void;
}

export function TripFormDialog({
  open,
  onOpenChange,
  editingTrip,
  orders,
  drivers,
  trucks,
  onSaved,
}: TripFormDialogProps) {
  const { t } = useTranslation();
  const today = new Date().toISOString().split("T")[0];

  const schema = React.useMemo(() => buildSchema(t), [t]);

  const form = useForm<TripFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      orderId: "",
      driverId: "",
      truckId: "",
      departureDate: today,
      estimatedArrivalDate: today,
      kmLoaded: 0,
      kmEmpty: 0,
      fuelCost: 0,
      revenue: 0,
      status: "planned",
      unscheduled: false,
    },
  });

  React.useEffect(() => {
    if (open && editingTrip) {
      form.reset({
        orderId: editingTrip.orderId,
        driverId: editingTrip.driverId,
        truckId: editingTrip.truckId,
        departureDate: editingTrip.departureDate ?? "",
        estimatedArrivalDate: editingTrip.estimatedArrivalDate ?? "",
        kmLoaded: editingTrip.kmLoaded,
        kmEmpty: editingTrip.kmEmpty,
        fuelCost: editingTrip.fuelCost,
        revenue: editingTrip.revenue ?? 0,
        status: editingTrip.status,
        unscheduled: !editingTrip.departureDate,
      });
    } else if (open && !editingTrip) {
      form.reset({
        orderId: "",
        driverId: "",
        truckId: "",
        departureDate: today,
        estimatedArrivalDate: today,
        kmLoaded: 0,
        kmEmpty: 0,
        fuelCost: 0,
        revenue: 0,
        status: "planned",
        unscheduled: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingTrip]);

  function handleClose() {
    onOpenChange(false);
    form.reset();
  }

  function onSubmit(values: TripFormValues) {
    try {
      if (editingTrip) {
        const updatedTrip: Trip = {
          ...editingTrip,
          ...values,
          kmLoaded: Number(values.kmLoaded),
          kmEmpty: Number(values.kmEmpty),
          fuelCost: Number(values.fuelCost),
          revenue: Number(values.revenue),
        };
        updateItem<Trip>(
          STORAGE_KEYS.trips,
          (tr) => tr.id === editingTrip.id,
          () => updatedTrip,
        );
        toast.success(t("trips.toast.updated"));
      } else {
        const newTrip: Trip = {
          id: generateId(),
          ...values,
          status: "planned",
          kmLoaded: Number(values.kmLoaded),
          kmEmpty: Number(values.kmEmpty),
          fuelCost: Number(values.fuelCost),
          revenue: Number(values.revenue),
        };
        addItem<Trip>(STORAGE_KEYS.trips, newTrip);
        updateItem<Order>(
          STORAGE_KEYS.orders,
          (o) => o.id === values.orderId,
          (o) => ({ ...o, status: "in_transit" }),
        );
        updateItem<Driver>(
          STORAGE_KEYS.drivers,
          (d) => d.id === values.driverId,
          (d) => ({ ...d, status: "on_trip" }),
        );
        toast.success(t("trips.toast.added"));
      }
      onSaved();
      handleClose();
    } catch (e) {
      console.warn("Failed to save trip:", e);
      toast.error(t("trips.toast.error"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-[580px] overflow-y-auto max-h-[90dvh]">
        <DialogHeader>
          <DialogTitle>
            {editingTrip ? t("trips.edit") : t("trips.add")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {editingTrip
              ? t("trips.dialog.editDesc")
              : t("trips.dialog.addDesc")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>{t("trips.fields.order")}</Label>
                <FormField
                  control={form.control}
                  name="orderId"
                  render={({ field }) => (
                    <FormItem className="w-full min-w-0">
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full min-w-0 [&>span]:truncate [&>span]:text-left">
                            <SelectValue
                              placeholder={t("trips.placeholders.order")}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent
                          className="max-h-52 w-[var(--radix-select-trigger-width)]"
                          position="popper"
                        >
                          {orders
                            .filter(
                              (o) =>
                                o.status === "pending" ||
                                o.status === "assigned" ||
                                o.status === "in_transit" ||
                                (editingTrip && o.id === editingTrip.orderId),
                            )
                            .map((order) => (
                              <SelectItem
                                key={order.id}
                                value={order.id}
                                className="[&>span:last-child]:truncate [&>span:last-child]:block"
                              >
                                {order.clientName} — {order.origin} →{" "}
                                {order.destination}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5 min-w-0">
                  <Label>{t("trips.fields.driver")}</Label>
                  <FormField
                    control={form.control}
                    name="driverId"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full min-w-0">
                              <SelectValue
                                placeholder={t("trips.placeholders.driver")}
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {drivers
                              .filter(
                                (d) =>
                                  d.status === "available" ||
                                  (editingTrip &&
                                    d.id === editingTrip.driverId),
                              )
                              .map((driver) => (
                                <SelectItem key={driver.id} value={driver.id}>
                                  {driver.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-1.5 min-w-0">
                  <Label>{t("trips.fields.truck")}</Label>
                  <FormField
                    control={form.control}
                    name="truckId"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full min-w-0">
                              <SelectValue
                                placeholder={t("trips.placeholders.truck")}
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="w-[var(--radix-select-trigger-width)]">
                            {trucks
                              .filter(
                                (tr) =>
                                  tr.status === "available" ||
                                  (editingTrip &&
                                    tr.id === editingTrip.truckId),
                              )
                              .map((truck) => (
                                <SelectItem
                                  key={truck.id}
                                  value={truck.id}
                                  className="[&>span:last-child]:truncate [&>span:last-child]:block"
                                >
                                  {truck.plateNumber} — {truck.brand}{" "}
                                  {truck.model}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="unscheduled-check"
                  checked={form.watch("unscheduled") ?? false}
                  onChange={(e) => {
                    form.setValue("unscheduled", e.target.checked);
                    if (e.target.checked) {
                      form.setValue("departureDate", "");
                      form.setValue("estimatedArrivalDate", "");
                    } else {
                      form.setValue("departureDate", today);
                      form.setValue("estimatedArrivalDate", today);
                    }
                  }}
                  className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                />
                <Label
                  htmlFor="unscheduled-check"
                  className="cursor-pointer text-sm font-normal"
                >
                  {t("trips.fields.unscheduled")}
                </Label>
              </div>

              {!form.watch("unscheduled") && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5 min-w-0">
                    <Label>{t("trips.fields.departureDate")}</Label>
                    <FormField
                      control={form.control}
                      name="departureDate"
                      render={({ field }) => (
                        <FormItem className="min-w-0">
                          <FormControl>
                            <Input
                              type="date"
                              className="w-full min-w-0"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-1.5 min-w-0">
                    <Label>{t("trips.fields.arrivalDate")}</Label>
                    <FormField
                      control={form.control}
                      name="estimatedArrivalDate"
                      render={({ field }) => (
                        <FormItem className="min-w-0">
                          <FormControl>
                            <Input
                              type="date"
                              className="w-full min-w-0"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-1.5 min-w-0">
                  <Label>{t("trips.fields.kmLoaded")}</Label>
                  <FormField
                    control={form.control}
                    name="kmLoaded"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder={t("trips.placeholders.km")}
                            className="w-full min-w-0"
                            value={
                              field.value === 0 ? "" : String(field.value)
                            }
                            onChange={(e) => {
                              const v = e.target.value.replace(
                                /[^0-9.]/g,
                                "",
                              );
                              field.onChange(
                                v === "" ? 0 : parseFloat(v) || 0,
                              );
                            }}
                            onBlur={() => {
                              if (!field.value) field.onChange(0);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-1.5 min-w-0">
                  <Label>{t("trips.fields.kmEmpty")}</Label>
                  <FormField
                    control={form.control}
                    name="kmEmpty"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder={t("trips.placeholders.km")}
                            className="w-full min-w-0"
                            value={
                              field.value === 0 ? "" : String(field.value)
                            }
                            onChange={(e) => {
                              const v = e.target.value.replace(
                                /[^0-9.]/g,
                                "",
                              );
                              field.onChange(
                                v === "" ? 0 : parseFloat(v) || 0,
                              );
                            }}
                            onBlur={() => {
                              if (!field.value) field.onChange(0);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-1.5 min-w-0">
                  <Label>{t("trips.fields.fuelCost")}</Label>
                  <FormField
                    control={form.control}
                    name="fuelCost"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder={t("trips.placeholders.km")}
                            className="w-full min-w-0"
                            value={
                              field.value === 0 ? "" : String(field.value)
                            }
                            onChange={(e) => {
                              const v = e.target.value.replace(
                                /[^0-9.]/g,
                                "",
                              );
                              field.onChange(
                                v === "" ? 0 : parseFloat(v) || 0,
                              );
                            }}
                            onBlur={() => {
                              if (!field.value) field.onChange(0);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-1.5 min-w-0">
                  <Label>{t("trips.fields.revenue")}</Label>
                  <FormField
                    control={form.control}
                    name="revenue"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder={t("trips.placeholders.km")}
                            className="w-full min-w-0"
                            value={
                              field.value === 0 ? "" : String(field.value)
                            }
                            onChange={(e) => {
                              const v = e.target.value.replace(
                                /[^0-9.]/g,
                                "",
                              );
                              field.onChange(
                                v === "" ? 0 : parseFloat(v) || 0,
                              );
                            }}
                            onBlur={() => {
                              if (!field.value) field.onChange(0);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              {editingTrip && (
                <div className="grid gap-1.5 min-w-0">
                  <Label>{t("trips.fields.status")}</Label>
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full min-w-0">
                              <SelectValue
                                placeholder={t("trips.placeholders.status")}
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="planned">
                              {t("trips.status.planned")}
                            </SelectItem>
                            <SelectItem value="in_desfasurare">
                              {t("trips.status.in_desfasurare")}
                            </SelectItem>
                            <SelectItem value="finalizata">
                              {t("trips.status.finalizata")}
                            </SelectItem>
                            <SelectItem value="anulata">
                              {t("trips.status.anulata")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 mt-5 sm:gap-0">
              <Button type="button" variant="outline" onClick={handleClose}>
                {t("trips.cancel")}
              </Button>
              <Button type="submit">
                {editingTrip ? t("trips.save") : t("trips.saveNew")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
