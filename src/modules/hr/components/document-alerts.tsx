import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Employee } from '@/modules/hr/types';

const WATCHED_TYPES = ['license', 'tachograph', 'adr', 'medical'] as const;

const TYPE_LABELS: Record<(typeof WATCHED_TYPES)[number], string> = {
  license: 'Permis conducere',
  tachograph: 'Tahograf',
  adr: 'ADR',
  medical: 'Aviz medical',
};

interface AlertRow {
  employeeName: string;
  docType: (typeof WATCHED_TYPES)[number];
  docName: string;
  expiryDate: string;
  daysLeft: number;
}

interface Props {
  employees: Employee[];
}

export function DocumentAlerts({ employees }: Props) {
  const today = new Date().toISOString().slice(0, 10);

  const rows: AlertRow[] = [];

  for (const emp of employees) {
    for (const doc of emp.documents) {
      if (!WATCHED_TYPES.includes(doc.type as any)) continue;
      if (!doc.expiryDate) continue;
      const expiryDate = new Date(doc.expiryDate);
      const daysLeft = Math.ceil((expiryDate.getTime() - new Date(today).getTime()) / 8640000);
      rows.push({
        employeeName: emp.name,
        docType: doc.type as (typeof WATCHED_TYPES)[number],
        docName: doc.name,
        expiryDate: doc.expiryDate,
        daysLeft,
      });
    }
  }
  //Sortare cele mai urgente, cele expirate sau cele care expira curand primele
  rows.sort((a, b) => a.daysLeft - b.daysLeft);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Alerte Documente
          {rows.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {rows.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Niciun document expirat sau care expiră în 30 de zile.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Angajat</TableHead>
                <TableHead>Tip document</TableHead>
                <TableHead>Denumire</TableHead>
                <TableHead>Data expirare</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{row.employeeName}</TableCell>
                  <TableCell>{TYPE_LABELS[row.docType]}</TableCell>
                  <TableCell>{row.docName || '—'}</TableCell>
                  <TableCell>{row.expiryDate}</TableCell>
                  <TableCell>
                    {row.daysLeft < 0 ? (
                      <Badge variant="destructive">Expirat</Badge>
                    ) : (
                      <Badge variant="outline" className="border-yellow-500 text-yellow-600 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-400">
                        {row.daysLeft === 0 ? 'Expiră azi' : `${row.daysLeft} zile`}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
