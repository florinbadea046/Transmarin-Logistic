export function stripD(s: unknown): string {
  return String(s ?? "")
    .replace(/[ăĂ]/g, (c) => c === "a" ? "a" : "A")
    .replace(/[âÂ]/g, (c) => c === "a" ? "a" : "A")
    .replace(/[îÎ]/g, (c) => c === "i" ? "i" : "I")
    .replace(/[șşŞ]/g, () => "s").replace(/[ȘŠ]/g, () => "S")
    .replace(/[țţŢ]/g, () => "t").replace(/[ȚŤ]/g, () => "T");
}

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
