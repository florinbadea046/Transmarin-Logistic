export function daysUntilExpiry(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${dateStr}T00:00:00`);
  return Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}

export function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("ro-RO");
}
