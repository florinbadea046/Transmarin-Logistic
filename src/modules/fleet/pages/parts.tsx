import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PartsCRUD } from "@/modules/fleet/components/PartsCRUD";

export default function PartsPage() {
  const { t } = useTranslation();

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("fleet.parts.pageTitle")}</h1>
      </Header>
      <Main>
        <Card>
          <CardHeader>
            <CardTitle>{t("fleet.parts.inventoryTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <PartsCRUD />
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
