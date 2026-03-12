// ──────────────────────────────────────────────────────────
// MODUL: Resurse Umane — Pagina principală
//
// Acest modul conține:
//   - /hr                 → Prezentare generală angajați
//   - /hr/employees       → Lista angajați + documente
//   - /hr/leaves          → Gestiune concedii
//   - /hr/payroll         → Calcul diurnă/bonus/amendă/ore supl.
//
// TODO pentru studenți:
//   1. CRUD angajați cu documente atașate
//   2. Alerte expirare documente (permis, tahograf, ADR, medical)
//   3. Gestiune concedii (cereri, aprobare, calendar)
//   4. Calcul diurnă, bonusuri, amenzi, ore suplimentare
//   5. Rapoarte lunare per angajat
// ──────────────────────────────────────────────────────────

import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';
import { TopNav } from '@/components/layout/top-nav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocation } from '@tanstack/react-router';
import { getCollection } from '@/utils/local-storage';
import { STORAGE_KEYS } from '@/data/mock-data';
import type { Employee, LeaveRequest, Bonus } from '@/modules/hr/types';
import { formatCurrency } from '../../utils/format';
import { DocumentAlerts } from '@/modules/hr/components/document-alerts';

const topNavLinks = [
  { title: 'Angajați', href: '/hr/employees', isActive: false },
  { title: 'Concedii', href: '/hr/leaves', isActive: false },
  { title: 'Salarizare', href: '/hr/payroll', isActive: false },
];

export default function HRPage() {
  const { pathname } = useLocation();
  const links = topNavLinks.map((link) => ({
    ...link,
    isActive: pathname === link.href || (link.href === '/hr/employees' && pathname === '/hr'),
  }));

  // Date din localStorage
  const employees = getCollection<Employee>(STORAGE_KEYS.employees);
  const leaves = getCollection<LeaveRequest>(STORAGE_KEYS.leaveRequests);
  const bonuses = getCollection<Bonus>(STORAGE_KEYS.bonuses);

  // Total angajați
  const totalEmployees = employees.length;

  // Concedii active luna curentă
  const today = [new Date().getFullYear(), String(new Date().getMonth() + 1).padStart(2, '0'), String(new Date().getDate()).padStart(2, '0')].join('-');

  // Total bonusuri luna aceasta
  const currentMonth = today.slice(0, 7);
  const activeLeavesThisMonth = leaves.filter((l) => {
    if (l.status !== 'approved') return false;
    // concediu care atinge luna curentă (simplificat)
    return l.startDate.startsWith(currentMonth) || l.endDate.startsWith(currentMonth);
  }).length;
  const totalBonusesThisMonth = bonuses
    .filter((b) => b.date.startsWith(currentMonth))
    .reduce((sum, b) => {
      const val = b.type === 'amenda' ? -Math.abs(b.amount) : Math.abs(b.amount);
      return sum + val;
    }, 0);

  // Documente expirate
  const expiredDocs = employees.reduce((count, emp) => {
    const expired = emp.documents.filter((d) => d.expiryDate && d.expiryDate < today).length;
    return count + expired;
  }, 0);

  return (
    <>
      <Header>
        <TopNav links={links} />
      </Header>
      <Main>
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Resurse Umane</h1>
          <p className="text-muted-foreground">Angajați, concedii, salarizare și documente.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Total Angajați</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalEmployees}</p>
              <p className="text-sm text-muted-foreground">Număr total de angajați în sistem</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>În Concediu</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{activeLeavesThisMonth}</p>
              <p className="text-sm text-muted-foreground">Cererile de concediu aprobate care se suprapun cu luna curentă.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Documente Expirate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-500">{expiredDocs}</p>
              <p className="text-sm text-muted-foreground">Numărul documentelor de angajat cu dată de expirare depășită.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Total bonusuri (luna)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{formatCurrency(totalBonusesThisMonth)}</p>
              <p className="text-sm text-muted-foreground">Diurnă/bonus/ore supl. − amenzi</p>
            </CardContent>
          </Card>
        </div>
        <DocumentAlerts employees={employees} />
      </Main>
    </>
  );
}
