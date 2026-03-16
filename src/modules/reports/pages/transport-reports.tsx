import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Order, Trip, Truck } from "@/modules/transport/types";

const TARIF_PER_KM = 2;

function DatePicker({ date, onSelect, placeholder }: {
  date: Date | undefined;
  onSelect: (d: Date | undefined) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "yyyy-MM-dd") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => { onSelect(d); setOpen(false); }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export default function TransportReportsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);

  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [filterClient, setFilterClient] = useState("");
  const [filterTruck, setFilterTruck] = useState("");

  useEffect(() => {
    setOrders(getCollection<Order>(STORAGE_KEYS.orders));
    setTrips(getCollection<Trip>(STORAGE_KEYS.trips));
    setTrucks(getCollection<Truck>(STORAGE_KEYS.trucks));
  }, []);

  const reportRows = useMemo(() => {
    const startStr = startDate ? format(startDate, "yyyy-MM-dd") : "";
    const endStr = endDate ? format(endDate, "yyyy-MM-dd") : "";
    return orders
      .filter((order) => {
        if (startStr && order.date < startStr) return false;
        if (endStr && order.date > endStr) return false;
        if (filterClient && !order.clientName.toLowerCase().includes(filterClient.toLowerCase())) return false;
        return true;
      })
      .map((order) => {
        const orderTrips = trips.filter((t) => t.orderId === order.id);
        const kmTotal = orderTrips.reduce((sum, t) => sum + t.kmLoaded + t.kmEmpty, 0);
        const fuelCost = orderTrips.reduce((sum, t) => sum + t.fuelCost, 0);
        const venit = orderTrips.reduce((sum, t) => sum + t.kmLoaded * TARIF_PER_KM, 0);
        const truck = trucks.find((tr) => orderTrips[0]?.truckId === tr.id);
        return { order, nrCurse: orderTrips.length, kmTotal, fuelCost, venit, truck };
      })
      .filter((row) => {
        if (row.nrCurse === 0) return false;
        if (filterTruck && row.truck?.id !== filterTruck) return false;
        return true;
      });
  }, [orders, trips, trucks, startDate, endDate, filterClient, filterTruck]);

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Rapoarte Transport</h1>
      </Header>
      <Main className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Filtre</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div className="space-y-1">
              <Label>De la</Label>
              <DatePicker date={startDate} onSelect={setStartDate} placeholder="Alege data..." />
            </div>
            <div className="space-y-1">
              <Label>Până la</Label>
              <DatePicker date={endDate} onSelect={setEndDate} placeholder="Alege data..." />
            </div>
            <div className="space-y-1">
              <Label>Client</Label>
              <Input placeholder="Caută client..." value={filterClient} onChange={e => setFilterClient(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Camion</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filterTruck}
                onChange={e => setFilterTruck(e.target.value)}
              >
                <option value="">Toate</option>
                {trucks.map(t => (
                  <option key={t.id} value={t.id}>{t.plateNumber}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rezultate ({reportRows.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="hidden md:block rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Rută</TableHead>
                    <TableHead>Dată</TableHead>
                    <TableHead className="text-right">Nr. Curse</TableHead>
                    <TableHead className="text-right">Km Total</TableHead>
                    <TableHead className="text-right">Cost Combustibil</TableHead>
                    <TableHead className="text-right">Venit estimat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        Niciun rezultat
                      </TableCell>
                    </TableRow>
                  ) : (
                    reportRows.map(({ order, nrCurse, kmTotal, fuelCost, venit }) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.clientName}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{order.origin} → {order.destination}</TableCell>
                        <TableCell className="tabular-nums">{order.date}</TableCell>
                        <TableCell className="text-right tabular-nums">{nrCurse}</TableCell>
                        <TableCell className="text-right tabular-nums">{kmTotal} km</TableCell>
                        <TableCell className="text-right tabular-nums">{fuelCost.toFixed(2)} RON</TableCell>
                        <TableCell className="text-right tabular-nums">{venit.toFixed(2)} RON</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden space-y-3">
              {reportRows.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Niciun rezultat</p>
              ) : (
                reportRows.map(({ order, nrCurse, kmTotal, fuelCost, venit }) => (
                  <div key={order.id} className="rounded-lg border p-4 space-y-2 text-sm">
                    <div className="font-medium text-base">{order.clientName}</div>
                    <div className="text-muted-foreground text-xs">{order.origin} → {order.destination}</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2 border-t">
                      <span className="text-muted-foreground">Dată</span>
                      <span className="tabular-nums">{order.date}</span>
                      <span className="text-muted-foreground">Nr. Curse</span>
                      <span className="tabular-nums">{nrCurse}</span>
                      <span className="text-muted-foreground">Km Total</span>
                      <span className="tabular-nums">{kmTotal} km</span>
                      <span className="text-muted-foreground">Cost Combustibil</span>
                      <span className="tabular-nums">{fuelCost.toFixed(2)} RON</span>
                      <span className="text-muted-foreground">Venit estimat</span>
                      <span className="tabular-nums font-medium">{venit.toFixed(2)} RON</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}