import type { Trip } from "@/modules/transport/types";

const STATUS_BADGE_CLASSES: Record<Trip["status"], string> = {
  planned:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
  in_desfasurare:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
  finalizata:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400",
  anulata:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400",
};

export function StatusBadge({
  status,
  label,
}: {
  status: Trip["status"];
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${STATUS_BADGE_CLASSES[status]}`}
    >
      {label}
    </span>
  );
}
