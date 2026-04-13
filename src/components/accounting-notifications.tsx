import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getCollection, setCollection } from "@/utils/local-storage";
import { STORAGE_KEYS } from "@/data/mock-data";
import type { Invoice } from "@/modules/accounting/types";
import type { BudgetCategory } from "@/pages/budget";

// ── Tipuri ─────────────────────────────────────────────────
export interface AccountingNotification {
  id: string;
  type: "overdue" | "due_today" | "budget_exceeded" | "unconfirmed";
  message: string;
  url: string;
  read: boolean;
  createdAt: string;
}

// ── Generare notificări ────────────────────────────────────
function generateNotifications(invoices: Invoice[], budgets: BudgetCategory[]): AccountingNotification[] {
  const notifications: AccountingNotification[] = [];
  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  invoices.forEach((inv) => {
    // Scadente azi
    if (inv.dueDate === today && inv.status !== "paid") {
      notifications.push({
        id: `due_today_${inv.id}`,
        type: "due_today",
        message: `Factura ${inv.number} este scadenta azi`,
        url: "/accounting/invoices",
        read: false,
        createdAt: today,
      });
    }

    // Restante > 7 zile
    if (inv.dueDate < sevenDaysAgo && inv.status === "overdue") {
      notifications.push({
        id: `overdue_${inv.id}`,
        type: "overdue",
        message: `Factura ${inv.number} este restanta de peste 7 zile`,
        url: "/accounting/invoices",
        read: false,
        createdAt: today,
      });
    }

    // Plati neconfirmate > 3 zile
    if (inv.date < threeDaysAgo && inv.status === "sent") {
      notifications.push({
        id: `unconfirmed_${inv.id}`,
        type: "unconfirmed",
        message: `Factura ${inv.number} neconfirmata de peste 3 zile`,
        url: "/accounting/invoices",
        read: false,
        createdAt: today,
      });
    }
  });

  // Buget depasit
  const expensePerCategory: Record<string, number> = {};
  invoices
    .filter((inv) => inv.type === "expense")
    .forEach((inv) => {
      const cat = (inv as any).category ?? "altele";
      expensePerCategory[cat] = (expensePerCategory[cat] ?? 0) + inv.total;
    });

  budgets.forEach((budget) => {
    const real = expensePerCategory[budget.id] ?? 0;
    const pct = budget.allocated > 0 ? (real / budget.allocated) * 100 : 0;
    if (pct > 90) {
      notifications.push({
        id: `budget_${budget.id}`,
        type: "budget_exceeded",
        message: `Bugetul pentru ${budget.name} a depasit ${Math.round(pct)}%`,
        url: "/accounting/budget",
        read: false,
        createdAt: today,
      });
    }
  });

  return notifications.slice(0, 200);
}

// ── Componenta ─────────────────────────────────────────────
export function AccountingNotifications() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AccountingNotification[]>([]);
  const navigate = useNavigate();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const invoices = getCollection<Invoice>(STORAGE_KEYS.invoices);
    const budgets = getCollection<BudgetCategory>(STORAGE_KEYS.budgets);
    const saved = getCollection<AccountingNotification>(STORAGE_KEYS.accounting_notifications);

    const generated = generateNotifications(invoices, budgets);

    // Merge: pastreaza read status pentru notificarile existente
    const merged = generated.map((n) => {
      const existing = saved.find((s) => s.id === n.id);
      return existing ? { ...n, read: existing.read } : n;
    });

    // FIFO max 200
    const final = merged.slice(0, 200);
    setCollection(STORAGE_KEYS.accounting_notifications, final);
    setNotifications(final);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    setCollection(STORAGE_KEYS.accounting_notifications, updated);
  };

  const markRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    setNotifications(updated);
    setCollection(STORAGE_KEYS.accounting_notifications, updated);
  };

  const handleClick = (n: AccountingNotification) => {
    markRead(n.id);
    setOpen(false);
    navigate({ to: n.url });
  };

  const iconColor = (type: AccountingNotification["type"]) => {
    if (type === "overdue") return "text-red-400";
    if (type === "due_today") return "text-orange-400";
    if (type === "budget_exceeded") return "text-yellow-400";
    return "text-blue-400";
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">{unreadCount > 99 ? "99+" : unreadCount}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notificari Contabilitate</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
              Marcheaza toate citite
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">Nu exista notificari</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} onClick={() => handleClick(n)} className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 border-b last:border-0 ${!n.read ? "bg-blue-500/5" : ""}`}>
                <div className={`mt-0.5 shrink-0 ${iconColor(n.type)}`}>
                  <Bell className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${!n.read ? "font-medium" : "text-muted-foreground"}`}>{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.createdAt}</p>
                </div>
                {!n.read && <div className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 shrink-0" />}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
