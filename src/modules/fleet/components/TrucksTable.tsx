import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Truck } from "@/modules/transport/types";

const statusConfig: Record<Truck["status"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  available:   { label: "Disponibil",   variant: "default" },
  on_trip:     { label: "În cursă",     variant: "secondary" },
  in_service:  { label: "În service",   variant: "destructive" },
};

const isExpired = (dateStr: string) => new Date(dateStr).getTime() < Date.now();
const isExpiringSoon = (dateStr: string) => {
  const diff = new Date(dateStr).getTime() - Date.now();
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
};

const DateCell = ({ date }: { date: string }) => {
  if (isExpired(date))
    return <span className="text-red-600 font-semibold">{date} ⚠️</span>;
  if (isExpiringSoon(date))
    return <span className="text-amber-500 font-semibold">{date} ⚠️</span>;
  return <span>{date}</span>;
};

export function TrucksTable() {
  const [trucks, setTrucks] = useState<Truck[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.trucks);
    if (raw) setTrucks(JSON.parse(raw));
  }, []);

  if (trucks.length === 0)
    return <p className="text-muted-foreground text-center py-10">Nu există camioane înregistrate.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground text-left">
            <th className="pb-3 pr-4 font-medium">Nr. înmatriculare</th>
            <th className="pb-3 pr-4 font-medium">Marcă / Model</th>
            <th className="pb-3 pr-4 font-medium">An</th>
            <th className="pb-3 pr-4 font-medium">Km</th>
            <th className="pb-3 pr-4 font-medium">Status</th>
            <th className="pb-3 pr-4 font-medium">ITP</th>
            <th className="pb-3 pr-4 font-medium">RCA</th>
            <th className="pb-3 font-medium">Vignetă</th>
          </tr>
        </thead>
        <tbody>
          {trucks.map((truck) => {
            const { label, variant } = statusConfig[truck.status];
            return (
              <tr key={truck.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                <td className="py-3 pr-4 font-semibold">{truck.plateNumber}</td>
                <td className="py-3 pr-4">{truck.brand} {truck.model}</td>
                <td className="py-3 pr-4">{truck.year}</td>
                <td className="py-3 pr-4">{truck.mileage.toLocaleString("ro-RO")} km</td>
                <td className="py-3 pr-4"><Badge variant={variant}>{label}</Badge></td>
                <td className="py-3 pr-4"><DateCell date={truck.itpExpiry} /></td>
                <td className="py-3 pr-4"><DateCell date={truck.rcaExpiry} /></td>
                <td className="py-3"><DateCell date={truck.vignetteExpiry} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}