// ──────────────────────────────────────────────────────────
// MODUL: Transport & Dispecerat — Pagina principală
//
// Acest modul conține:
//   - /transport           → Lista comenzi + dashboard operațional
//   - /transport/orders    → Gestiune comenzi (import CSV/Excel)
//   - /transport/trips     → Planificare curse zilnice
//   - /transport/drivers   → Asociere șofer ↔ camion
//
// TODO pentru studenți:
//   1. Implementați tabelul cu comenzi (TanStack Table)
//   2. Import comenzi din CSV/Excel (Papaparse / xlsx)
//   3. Planificare curse zilnice cu drag & drop sau formular
//   4. Dashboard operațional cu KPI-uri
//   5. Calcul cost per cursă (km gol vs încărcat)
// ──────────────────────────────────────────────────────────

export default function TransportPage() {
  const { pathname } = useLocation();

  const links = topNavLinks.map((link) => ({
    ...link,
    isActive:
      pathname === link.href ||
      (link.href === "/transport/orders" && pathname === "/transport"),
  }));

  // 🔹 AICI începe logica KPI (NU în map)

  const orders = getCollection<Order>(STORAGE_KEYS.transport_orders);
  const trips = getCollection<Trip>(STORAGE_KEYS.transport_trips);

  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();

  const activeOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status === "pending" ||
          o.status === "assigned" ||
          o.status === "in_transit"
      ).length,
    [orders]
  );

  const tripsToday = useMemo(
    () =>
      trips.filter((t) => {
        const d = new Date(t.date);
        return (
          d.getDate() === today.getDate() &&
          d.getMonth() === month &&
          d.getFullYear() === year
        );
      }).length,
    [trips]
  );

  const totalKmMonth = useMemo(
    () =>
      trips
        .filter((t) => {
          const d = new Date(t.date);
          return d.getMonth() === month && d.getFullYear() === year;
        })
        .reduce((sum, t) => sum + t.kmLoaded + t.kmEmpty, 0),
    [trips]
  );

  return (
    <>
      <Header>
        <TopNav links={links} />
      </Header>

      <Main>
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Transport & Dispecerat</h1>
          <p className="text-muted-foreground">
            Gestionează comenzile, cursele și asocierea șofer-camion.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Comenzi Active</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{activeOrders}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Curse Azi</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{tripsToday}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Km Total Luna</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalKmMonth}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Lista Comenzi</CardTitle>
          </CardHeader>
          <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
            TODO: Tabel TanStack Table cu comenzi — import CSV, filtrare, sortare
          </CardContent>
        </Card>
      </Main>
    </>
  );
}