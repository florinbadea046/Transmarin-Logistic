// ──────────────────────────────────────────────────────────
// MODUL: Parc Auto & Service — Pagina principală
// ──────────────────────────────────────────────────────────

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { TrucksTable } from "@/modules/fleet/components/TrucksTable";
import { TrucksCount } from "@/modules/fleet/components/TrucksCount";
import { LowStockCount } from "@/modules/fleet/components/LowStockCount";
import { ServiceCount } from "@/modules/fleet/components/ServiceCount";
import { ServiceCostMonth } from "@/modules/fleet/components/ServiceCostMonth";
import { FuelCostMonth } from "@/modules/fleet/components/FuelCostMonth";
import { DocExpiryAlerts } from "@/modules/fleet/components/DocExpiryAlerts";

export default function FleetPage() {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  const topNavLinks = [
    { title: t("fleet.nav.parts"), href: "/fleet/parts", isActive: false },
    { title: t("fleet.nav.service"), href: "/fleet/service", isActive: false },
    { title: t("fleet.nav.fuel"), href: "/fleet/fuel", isActive: false },
  ];

  const links = topNavLinks.map((link) => ({
    ...link,
    isActive:
      pathname === link.href ||
      (link.href === "/fleet/parts" && pathname === "/fleet"),
  }));

  return (
    <>
      <Header>
        <TopNav links={links} />
      </Header>
      <Main>
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{t("fleet.title")}</h1>
          <p className="text-muted-foreground">{t("fleet.subtitle")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader><CardTitle>{t("fleet.trucksInFleet")}</CardTitle></CardHeader>
            <CardContent><TrucksCount /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t("fleet.lowStock")}</CardTitle></CardHeader>
            <CardContent><LowStockCount /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t("fleet.scheduledService")}</CardTitle></CardHeader>
            <CardContent><ServiceCount /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t("fleet.serviceCostMonth")}</CardTitle></CardHeader>
            <CardContent><ServiceCostMonth /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t("fleet.fuelCostMonth")}</CardTitle></CardHeader>
            <CardContent><FuelCostMonth /></CardContent>
          </Card>
        </div>

        <DocExpiryAlerts />

        <Card className="mt-6">
          <CardHeader><CardTitle>{t("fleet.truckList")}</CardTitle></CardHeader>
          <CardContent><TrucksTable /></CardContent>
        </Card>
      </Main>
    </>
  );
}
