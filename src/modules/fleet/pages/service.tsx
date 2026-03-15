import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceCRUD } from "@/modules/fleet/components/ServiceCRUD";
import { ServiceSchedule } from "@/modules/fleet/components/ServiceSchedule";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { ServiceRecord } from "@/modules/fleet/types";
import type { Truck } from "@/modules/transport/types";

export default function ServicePage() {
  const [records, setRecords] = useState<ServiceRecord[]>(() =>
    getCollection<ServiceRecord>(STORAGE_KEYS.serviceRecords)
  );
  const [trucks] = useState<Truck[]>(() =>
    getCollection<Truck>(STORAGE_KEYS.trucks)
  );

  const handleRecordsChange = (updated: ServiceRecord[]) => {
    setRecords(updated);
  };

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Service & Reparații</h1>
      </Header>
      <Main>
        <div className="flex flex-col gap-6">
          <ServiceSchedule records={records} trucks={trucks} />
          <Card>
            <CardHeader>
              <CardTitle>Istoric Service</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-4">
              <ServiceCRUD records={records} trucks={trucks} onRecordsChange={handleRecordsChange} />
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  );
}