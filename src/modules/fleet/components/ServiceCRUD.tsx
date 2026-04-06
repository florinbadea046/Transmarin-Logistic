import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { STORAGE_KEYS } from "@/data/mock-data";
import { getCollection } from "@/utils/local-storage";
import { useAuditLog } from "@/hooks/use-audit-log";
import { toast } from "sonner";

import type { ServiceRecord, Part } from "@/modules/fleet/types";
import type { Truck } from "@/modules/transport/types";

import {
  getTypeLabels,
  calculateTotalCost,
  getPartName,
} from "@/modules/fleet/utils/serviceUtils";
import { exportServiceToPDF } from "@/modules/fleet/utils/exportPDF";
import { ServiceFormDialog } from "@/modules/fleet/components/ServiceFormDialog";
import {
  createEmptyForm,
  type ServiceFormData,
} from "@/modules/fleet/utils/serviceFormHelpers";

interface ServiceCRUDProps {
  records: ServiceRecord[];
  trucks: Truck[];
  onRecordsChange: (updated: ServiceRecord[]) => void;
}

function syncTruckStatus(truckId: string, allRecords: ServiceRecord[]) {
  const trucks = getCollection<Truck>(STORAGE_KEYS.trucks);
  const today = new Date().toISOString().split("T")[0];

  const hasActiveService = allRecords
    .filter((r) => r.truckId === truckId)
    .some((r) => {
      const isRecent =
        new Date(r.date) >=
        new Date(new Date().setDate(new Date().getDate() - 30));
      const hasUpcoming = r.nextServiceDate
        ? r.nextServiceDate >= today
        : false;
      return isRecent || hasUpcoming;
    });

  const updatedTrucks = trucks.map((t) => {
    if (t.id !== truckId) return t;
    if (t.status === "on_trip") return t;
    return {
      ...t,
      status: hasActiveService ? "in_service" : "available",
    } as Truck;
  });

  localStorage.setItem(STORAGE_KEYS.trucks, JSON.stringify(updatedTrucks));
}

export function ServiceCRUD({
  records,
  trucks,
  onRecordsChange,
}: ServiceCRUDProps) {
  const { t } = useTranslation();
  const { log } = useAuditLog();
  const typeLabels = getTypeLabels(t);

  const [parts] = useState<Part[]>(() =>
    getCollection<Part>(STORAGE_KEYS.parts),
  );
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ServiceFormData>(createEmptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);

  const [filterTruckId, setFilterTruckId] = useState("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (filterTruckId !== "all" && record.truckId !== filterTruckId)
        return false;
      if (filterFrom && record.date < filterFrom) return false;
      if (filterTo && record.date > filterTo) return false;
      return true;
    });
  }, [filterFrom, filterTo, filterTruckId, records]);

  const persist = (data: ServiceRecord[], affectedTruckId?: string) => {
    onRecordsChange(data);
    localStorage.setItem(STORAGE_KEYS.serviceRecords, JSON.stringify(data));
    if (affectedTruckId) syncTruckStatus(affectedTruckId, data);
  };

  const getTruckLabel = (id: string) => {
    const truck = trucks.find((tr) => tr.id === id);
    return truck ? `${truck.plateNumber} — ${truck.brand} ${truck.model}` : id;
  };

  const handleEdit = (record: ServiceRecord) => {
    setForm({
      ...record,
      partsUsed: record.partsUsed.map((p) => ({
        id: crypto.randomUUID(),
        partId: p.partId,
        quantity: p.quantity,
      })),
      nextServiceDate: record.nextServiceDate || "",
    });
    setEditingId(record.id);
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!form.truckId || !form.date) return;

    const totalCost = calculateTotalCost(form.partsUsed, parts);

    const payload: ServiceRecord = {
      id: editingId || crypto.randomUUID(),
      ...form,
      partsUsed: form.partsUsed.map(({ id: _id, ...rest }) => rest),
      cost: totalCost,
      nextServiceDate: form.nextServiceDate || undefined,
    };

    const truckLabel = getTruckLabel(form.truckId);
    let updated: ServiceRecord[];
    if (editingId) {
      updated = records.map((r) => (r.id === editingId ? payload : r));
      log({ action: "update", entity: "service", entityId: editingId, entityLabel: truckLabel, detailKey: "activityLog.details.serviceUpdated", oldValue: { type: records.find((r) => r.id === editingId)?.type, cost: records.find((r) => r.id === editingId)?.cost }, newValue: { type: payload.type, cost: payload.cost } });
      toast.success(t("fleet.service.toastUpdated"));
    } else {
      updated = [...records, payload];
      log({ action: "create", entity: "service", entityId: payload.id, entityLabel: truckLabel, detailKey: "activityLog.details.serviceCreated", detailParams: { truck: truckLabel } });
      toast.success(t("fleet.service.toastAdded"));
    }

    persist(updated, form.truckId);
    setForm(createEmptyForm());
    setEditingId(null);
    setOpen(false);
  };

  const handleDelete = (id: string) => {
    const record = records.find((r) => r.id === id);
    const truckLabel = record ? getTruckLabel(record.truckId) : id;
    log({ action: "delete", entity: "service", entityId: id, entityLabel: truckLabel, detailKey: "activityLog.details.serviceDeleted" });
    const updated = records.filter((r) => r.id !== id);
    persist(updated, record?.truckId);
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setForm(createEmptyForm());
      setEditingId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 items-end mb-4 px-4 md:px-6">
        <Button
          onClick={() => {
            setForm(createEmptyForm());
            setEditingId(null);
            setOpen(true);
          }}
        >
          {t("fleet.service.addService")}
        </Button>

        <Select value={filterTruckId} onValueChange={setFilterTruckId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("fleet.service.allTrucks")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("fleet.service.allTrucks")}</SelectItem>
            {trucks.map((tr) => (
              <SelectItem key={tr.id} value={tr.id}>
                {tr.plateNumber}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={filterFrom}
          onChange={(e) => setFilterFrom(e.target.value)}
          className="w-36"
        />
        <Input
          type="date"
          value={filterTo}
          onChange={(e) => setFilterTo(e.target.value)}
          className="w-36"
        />

        <Button
          variant="outline"
          onClick={() =>
            exportServiceToPDF(filteredRecords, trucks, t, {
              truckId: filterTruckId === "all" ? undefined : filterTruckId,
              fromDate: filterFrom || undefined,
              toDate: filterTo || undefined,
            })
          }
        >
          {t("fleet.service.exportPDF")}
        </Button>
      </div>

      {filteredRecords.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">
          {t("fleet.service.noRecords")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("fleet.service.columnTruck")}</TableHead>
                <TableHead>{t("fleet.service.columnDate")}</TableHead>
                <TableHead>{t("fleet.service.columnType")}</TableHead>
                <TableHead>{t("fleet.service.columnDescription")}</TableHead>
                <TableHead>{t("fleet.service.columnKm")}</TableHead>
                <TableHead>{t("fleet.service.columnParts")}</TableHead>
                <TableHead>{t("fleet.service.columnCost")}</TableHead>
                <TableHead>{t("fleet.service.columnNext")}</TableHead>
                <TableHead className="text-center">{t("fleet.service.columnActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-semibold">
                    {getTruckLabel(record.truckId)}
                  </TableCell>
                  <TableCell>{record.date}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{typeLabels[record.type]}</Badge>
                  </TableCell>
                  <TableCell>{record.description}</TableCell>
                  <TableCell>
                    {record.mileageAtService.toLocaleString("ro-RO")} km
                  </TableCell>
                  <TableCell>
                    {record.partsUsed.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <ul className="text-xs space-y-1">
                        {record.partsUsed.map((pu, index) => (
                          <li key={`${pu.partId}-${index}`}>
                            {getPartName(parts, pu.partId)} × {pu.quantity}
                          </li>
                        ))}
                      </ul>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {record.cost.toLocaleString("ro-RO")} RON
                  </TableCell>
                  <TableCell>{record.nextServiceDate ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-2 justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(record)}
                      >
                        {t("fleet.service.edit")}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(record.id)}
                      >
                        {t("fleet.service.delete")}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ServiceFormDialog
        open={open}
        onOpenChange={handleOpenChange}
        form={form}
        onFormChange={setForm}
        editingId={editingId}
        trucks={trucks}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
