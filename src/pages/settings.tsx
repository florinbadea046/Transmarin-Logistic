// ──────────────────────────────────────────────────────────
// Pagina Setări
// ──────────────────────────────────────────────────────────

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

export default function SettingsPage() {
  const { t } = useTranslation();

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">{t("settings.title")}</h1>
      </Header>
      <Main>
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.profileTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
            {t("settings.profilePlaceholder")}
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
