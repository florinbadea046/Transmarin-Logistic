import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceCRUD } from "@/modules/fleet/components/ServiceCRUD";

export default function ServicePage() {
  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold">Service & Reparații</h1>
      </Header>
      <Main>
        <Card>
          <CardHeader>
            <CardTitle>Istoric Service</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <ServiceCRUD />
          </CardContent>
        </Card>
      </Main>
    </>
  );
}