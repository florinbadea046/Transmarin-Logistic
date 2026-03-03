// ──────────────────────────────────────────────────────────
// Pagina Setări — placeholder
// TODO: Studenții pot adăuga setări per utilizator
// ──────────────────────────────────────────────────────────

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Setări</h1>
      </Header>
      <Main>
        <Card>
          <CardHeader>
            <CardTitle>Setări Profil</CardTitle>
          </CardHeader>
          <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
            TODO: Formular setări profil utilizator
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
