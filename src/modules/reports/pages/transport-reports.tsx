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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Order, Trip, Truck } from "@/modules/transport/types";

const TARIF_PER_KM = 2;

const orderStatusLabel = (status: string) => {
  switch (status) {
    case "completed":
      return "Finalizată";
    case "in_progress":
      return "În curs";
    case "pending":
      return "În așteptare";
    default:
      return status;
  }
};

function DatePicker({ date, onSelect, placeholder }: { date: Date | undefined; onSelect: (d: Date | undefined) => void; placeholder: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "yyyy-MM-dd") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            onSelect(d);
            setOpen(false);
          }}
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

  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
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

        return { order, nrCurse: orderTrips.length, kmTotal, fuelCost, venit };
      })
      .filter((row) => {
        if (row.nrCurse === 0) return false;
        return true;
      });
  }, [orders, trips, startDate, endDate, filterClient]);

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Rapoarte Transport</h1>
      </Header>

      <Main className="space-y-4">
        {/* FILTRE */}
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
              <Input value={filterClient} onChange={(e) => setFilterClient(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* REZULTATE */}
        <Card>
          <CardHeader>
            <CardTitle>Rezultate ({reportRows.length})</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="hidden md:block">
              <Table>
                <TableBody>
                  {reportRows.map(({ order, nrCurse, kmTotal, fuelCost, venit }) => (
                    <TableRow key={order.id}>
                      <TableCell>{order.clientName}</TableCell>
                      <TableCell>{nrCurse}</TableCell>
                      <TableCell>{kmTotal}</TableCell>
                      <TableCell>{fuelCost.toFixed(2)}</TableCell>
                      <TableCell>{venit.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* COMENZI */}
            <div className="mt-6">
              <Table>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{order.clientName}</TableCell>
                      <TableCell>{order.origin}</TableCell>
                      <TableCell>{order.destination}</TableCell>
                      <TableCell>{order.date}</TableCell>
                      <TableCell>{order.weight}</TableCell>
                      <TableCell>{orderStatusLabel(order.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
