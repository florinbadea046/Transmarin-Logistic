import { useMemo } from "react";
import { BarChart3, TrendingUp, AlertTriangle, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

// ── Tipuri locale ─────────────────────────────────────────────────────────────
interface InvoiceLine {
  id: string;
  descriere: string;
  cantitate: number;
  pretUnitar: number;
}

interface Invoice {
  id: string;
  nr: string;
  tip: "venit" | "cheltuială";
  data: string;
  scadenta?: string;
  clientFurnizor: string;
  linii: InvoiceLine[];
  status: "plătită" | "neplatită" | "parțial";
}

interface Props {
  invoices: Invoice[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcTotal(linii: InvoiceLine[]) {
  const sub = linii.reduce((s, l) => s + l.cantitate * l.pretUnitar, 0);
  return sub * 1.19;
}

function padTwo(n: number) {
  return String(n).padStart(2, "0");
}

function monthKey(ymd: string) {
  return ymd.slice(0, 7);
}

function shortMonth(ym: string) {
  const [y, m] = ym.split("-");
  const names = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun",
                  "Iul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[parseInt(m) - 1]} ${y.slice(2)}`;
}

// today e constant — scos afară din componentă ca să nu intre în deps useMemo
const TODAY = new Date();
const THIS_MONTH = `${TODAY.getFullYear()}-${padTwo(TODAY.getMonth() + 1)}`;

// ── Componenta ─────────────────────────────────────────────────────────────────
export function FinancialSection({ invoices }: Props) {

  // Card 1 — Facturi luna curenta
  const facturiLuna = useMemo(
    () => invoices.filter((inv) => monthKey(inv.data) === THIS_MONTH),
    [invoices],
  );

  // Card 2 — Sold (venituri - cheltuieli)
  const sold = useMemo(() => {
    let venituri = 0;
    let cheltuieli = 0;
    for (const inv of invoices) {
      const total = calcTotal(inv.linii);
      if (inv.tip === "venit") venituri += total;
      else cheltuieli += total;
    }
    return { venituri, cheltuieli, sold: venituri - cheltuieli };
  }, [invoices]);

  // Grafic — trend 3 luni
  const trend3 = useMemo(() => {
    const months: string[] = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(TODAY.getFullYear(), TODAY.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${padTwo(d.getMonth() + 1)}`);
    }
    return months.map((ym) => {
      const slice = invoices.filter((inv) => monthKey(inv.data) === ym);
      let venituri = 0;
      let cheltuieli = 0;
      for (const inv of slice) {
        const t = calcTotal(inv.linii);
        if (inv.tip === "venit") venituri += t;
        else cheltuieli += t;
      }
      return { luna: shortMonth(ym), venituri, cheltuieli };
    });
  }, [invoices]);

  // Alerte — facturi neplatite > 30 zile
  const overdueInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (inv.status === "plătită") return false;
      const scadenta = inv.scadenta ?? inv.data;
      const diffDays =
        (TODAY.getTime() - new Date(scadenta).getTime()) / (1000 * 60 * 60 * 24);
      return diffDays > 30;
    });
  }, [invoices]);

  const formatRON = (n: number) =>
    new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON" }).format(n);

  return (
    <div className="space-y-4">
      {/* Titlu sectiune */}
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-base font-semibold">Financiar — Sumar</h2>
      </div>

      {/* KPI Cards — 1 coloana pe mobile, 3 pe desktop */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card Facturi Luna */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Facturi Luna
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{facturiLuna.length}</div>
            <p className="text-xs text-muted-foreground">
              emise în {shortMonth(THIS_MONTH)}
            </p>
          </CardContent>
        </Card>

        {/* Card Sold */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sold
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                sold.sold >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {formatRON(sold.sold)}
            </div>
            <p className="text-xs text-muted-foreground">
              venituri − cheltuieli (total)
            </p>
          </CardContent>
        </Card>

        {/* Card Facturi Restante */}
        <Card
          className={overdueInvoices.length > 0 ? "border-orange-500/50" : ""}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Facturi Restante
            </CardTitle>
            <AlertTriangle
              className={`h-4 w-4 ${
                overdueInvoices.length > 0
                  ? "text-orange-500"
                  : "text-muted-foreground"
              }`}
            />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                overdueInvoices.length > 0 ? "text-orange-500" : ""
              }`}
            >
              {overdueInvoices.length}
            </div>
            <p className="text-xs text-muted-foreground">
              neplatite &gt; 30 zile
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grafic trend 3 luni — full width, height adaptat */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Venituri vs. Cheltuieli — ultimele 3 luni
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2">
          <ResponsiveContainer width="100%" height={200} minWidth={0}>
            <BarChart
              data={trend3}
              margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="luna"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={55}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  color: "hsl(var(--foreground))",
                }}
                labelStyle={{
                  color: "hsl(var(--muted-foreground))",
                  marginBottom: 4,
                }}
                formatter={(value, name): [string, string] => [
                  formatRON(typeof value === "number" ? value : 0),
                  name === "venituri" ? "Venituri" : "Cheltuieli",
                ]}
              />
              <Bar
                dataKey="venituri"
                fill="hsl(var(--primary))"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="cheltuieli"
                fill="hsl(var(--destructive))"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}