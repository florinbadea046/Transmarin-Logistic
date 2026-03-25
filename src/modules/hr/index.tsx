// ──────────────────────────────────────────────────────────
// MODUL: Resurse Umane — Pagina principală
// ──────────────────────────────────────────────────────────

import * as React from 'react';
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

import { PieChart, Pie, Cell, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const DEPT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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

  const employees = React.useMemo(() => getCollection<Employee>(STORAGE_KEYS.employees), []);

  const leaves = React.useMemo(() => getCollection<LeaveRequest>(STORAGE_KEYS.leaveRequests), []);

  const bonuses = React.useMemo(() => getCollection<Bonus>(STORAGE_KEYS.bonuses), []);

  const now = new Date();
  const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');

  const currentMonth = today.slice(0, 7);

  const totalEmployees = employees.length;

  const activeLeavesThisMonth = leaves.filter((l) => {
    if (l.status !== 'approved') return false;
    return l.startDate.startsWith(currentMonth) || l.endDate.startsWith(currentMonth);
  }).length;

  const totalBonusesThisMonth = bonuses
    .filter((b) => b.date.startsWith(currentMonth))
    .reduce((sum, b) => {
      const val = b.type === 'amenda' ? -Math.abs(b.amount) : Math.abs(b.amount);
      return sum + val;
    }, 0);

  const expiredDocs = employees.reduce((count, emp) => {
    const expired = emp.documents.filter((d) => d.expiryDate && d.expiryDate < today).length;
    return count + expired;
  }, 0);

  const pieData = React.useMemo(() => {
    const deptMap: Record<string, number> = {};
    employees.forEach((e) => {
      deptMap[e.department] = (deptMap[e.department] || 0) + 1;
    });
    return Object.entries(deptMap).map(([name, value]) => ({ name, value }));
  }, [employees]);

  const barData = React.useMemo(() => {
    const months = [...Array(6)].map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        label: d.toLocaleString('ro-RO', { month: 'short' }),
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        bonusuri: 0,
        amenzi: 0,
      };
    });

    bonuses.forEach((b) => {
      const entry = months.find((m) => m.key === b.date.slice(0, 7));
      if (!entry) return;

      if (b.type === 'amenda') {
        entry.amenzi += Math.abs(b.amount);
      } else {
        entry.bonusuri += Math.abs(b.amount);
      }
    });

    return months;
  }, [bonuses]);

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

        {/* Statistici rapide */}
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
              <p className="text-sm text-muted-foreground">Cereri aprobate în luna curentă</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documente Expirate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-500">{expiredDocs}</p>
              <p className="text-sm text-muted-foreground">Documente depășite ca valabilitate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total bonusuri (luna)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{formatCurrency(totalBonusesThisMonth)}</p>
              <p className="text-sm text-muted-foreground">Bonusuri − amenzi</p>
            </CardContent>
          </Card>
        </div>

        <DocumentAlerts employees={employees} />

        {/* Grafice */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Angajați per Departament</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} strokeWidth={0}>
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={DEPT_COLORS[index % DEPT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bonusuri vs Amenzi (ultimele 6 luni)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) =>
                      new Intl.NumberFormat('ro-RO', {
                        notation: 'compact',
                        compactDisplay: 'short',
                      }).format(v)
                    }
                  />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="bonusuri" name="Bonusuri" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="amenzi" name="Amenzi" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  );
}
