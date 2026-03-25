import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FuelCRUD } from "@/modules/fleet/components/FuelCRUD";


export default function FuelPage() {
  const { t } = useTranslation();

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("fleet.fuel.pageTitle")}</h1>
      </Header>
      <Main>
        <Card>
          <CardHeader>
            <CardTitle>{t("fleet.fuel.fuelVsMileage")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <FuelCRUD />
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
