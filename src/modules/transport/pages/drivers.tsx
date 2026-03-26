// ──────────────────────────────────────────────────────────
// Transport → Sub-pagină: Șoferi & Camioane
// Entry point — orchestrează datele și randează secțiunile
// ──────────────────────────────────────────────────────────

import * as React from "react";
import { useTranslation } from "react-i18next";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";

import type { Driver, Truck } from "@/modules/transport/types";
import { getCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import { ExpiryAlerts } from "./_components/transport-shared";
import { daysUntilExpiry } from "./_components/transport-shared-utils";
import { DriversSection } from "./_components/drivers-section";
import { TrucksSection } from "./_components/trucks-section";

export default function DriversPage() {
  const { t } = useTranslation();
  const [drivers, setDrivers] = React.useState<Driver[]>([]);
  const [trucks, setTrucks] = React.useState<Truck[]>([]);

  const loadData = () => {
    setDrivers(getCollection<Driver>(STORAGE_KEYS.drivers));
    setTrucks(getCollection<Truck>(STORAGE_KEYS.trucks));
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const expiringDrivers = drivers.filter(
    (d) => daysUntilExpiry(d.licenseExpiry) <= 30,
  );
  const expiringTrucks = trucks.filter(
    (t) =>
      daysUntilExpiry(t.itpExpiry) <= 30 ||
      daysUntilExpiry(t.rcaExpiry) <= 30 ||
      daysUntilExpiry(t.vignetteExpiry) <= 30,
  );

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("driversPage.title")}</h1>
      </Header>

      <Main>
        <ExpiryAlerts
          expiringDrivers={expiringDrivers}
          expiringTrucks={expiringTrucks}
        />

        <div className="space-y-6">
          <DriversSection
            drivers={drivers}
            trucks={trucks}
            onDataChange={loadData}
          />
          <TrucksSection
            drivers={drivers}
            trucks={trucks}
            onDataChange={loadData}
          />
        </div>
      </Main>
    </>
  );
}
