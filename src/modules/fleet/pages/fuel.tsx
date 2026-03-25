import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FuelCRUD } from "@/modules/fleet/components/FuelCRUD";


export default function FuelPage() {
  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Evidență Combustibil</h1>
      </Header>
      <Main>
        <Card>
          <CardHeader>
            <CardTitle>Combustibil vs. Rulaj</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <FuelCRUD />
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
