// BaseNotificationCenter — chenar partajat pentru toate centrele de notificari
// din aplicatie (Transport / HR / Accounting). Capteaza UI scaffold-ul comun:
// bell cu badge, popover pe desktop / sheet pe mobile, lista, mark-as-read,
// mark-all, total footer, timestamp relativ.
//
// Consumatorii aduc doar datele si randeaza iconita + titlul + mesajul per item
// prin `renderItem`. Starea (generare, persistare) e a consumatorului.

import type { ReactNode } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import useDialogState from "@/hooks/use-dialog-state";
import { useMobile } from "@/hooks/use-mobile";
import { getDateLocale } from "@/utils/format";

export interface NotificationLike {
  id: string;
  createdAt: string;
  read: boolean;
}

export interface NotificationItemRender {
  icon: ReactNode;
  title: ReactNode;
  message: ReactNode;
}

export interface NotificationCenterLabels {
  title: string;
  empty: string;
  markAllRead: string;
  markRead: string;
  /** Returneaza textul pentru badge-ul "X noi". */
  newBadge: (count: number) => string;
  /** Returneaza textul pentru footer-ul "X notificari total". */
  total: (count: number) => string;
}

export interface NotificationCenterProps<T extends NotificationLike> {
  labels: NotificationCenterLabels;
  notifications: T[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onItemClick?: (item: T) => void;
  renderItem: (item: T) => NotificationItemRender;
}

function BellButton({
  unreadCount,
  onClick,
  label,
}: {
  unreadCount: number;
  onClick?: () => void;
  label: string;
}) {
  return (
    <Button variant="outline" size="icon" className="relative" aria-label={label} onClick={onClick}>
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <Badge
          className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full p-0 px-1 text-[10px] leading-none"
          variant="destructive"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </Button>
  );
}

function NotificationItem<T extends NotificationLike>({
  notification,
  render,
  onMarkAsRead,
  onItemClick,
  markReadLabel,
}: {
  notification: T;
  render: (item: T) => NotificationItemRender;
  onMarkAsRead: (id: string) => void;
  onItemClick?: (item: T) => void;
  markReadLabel: string;
}) {
  const { icon, title, message } = render(notification);
  const clickable = !!onItemClick;

  const handleClick = () => onItemClick?.(notification);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!clickable) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onItemClick?.(notification);
    }
  };

  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? handleClick : undefined}
      onKeyDown={clickable ? handleKeyDown : undefined}
      className={cn(
        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        clickable && "cursor-pointer",
        !notification.read ? "bg-muted/50 hover:bg-muted" : "hover:bg-muted/30",
      )}
    >
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className={cn("text-sm leading-snug", !notification.read && "font-medium")}>{title}</p>
        <p className="text-xs text-muted-foreground leading-snug break-words">{message}</p>
        <p className="text-[10px] text-muted-foreground/70 pt-0.5">
          {formatDistanceToNow(parseISO(notification.createdAt), {
            addSuffix: true,
            locale: getDateLocale(),
          })}
        </p>
      </div>
      {!notification.read && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onMarkAsRead(notification.id);
          }}
          aria-label={markReadLabel}
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

function NotificationList<T extends NotificationLike>({
  labels,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onItemClick,
  renderItem,
}: NotificationCenterProps<T> & { unreadCount: number }) {
  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{labels.title}</span>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {labels.newBadge(unreadCount)}
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-muted-foreground"
            onClick={onMarkAllAsRead}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            <span>{labels.markAllRead}</span>
          </Button>
        )}
      </div>

      <Separator className="shrink-0" />

      <ScrollArea className="h-[320px]">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <Bell className="h-8 w-8 opacity-30" />
            <p className="text-sm">{labels.empty}</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                render={renderItem}
                onMarkAsRead={onMarkAsRead}
                onItemClick={onItemClick}
                markReadLabel={labels.markRead}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {notifications.length > 0 && (
        <>
          <Separator className="shrink-0" />
          <div className="px-4 py-2 text-center text-xs text-muted-foreground shrink-0">
            {labels.total(notifications.length)}
          </div>
        </>
      )}
    </div>
  );
}

export function NotificationCenter<T extends NotificationLike>(props: NotificationCenterProps<T>) {
  const isMobile = useMobile(640);
  const [open, setOpen] = useDialogState(false);
  const unreadCount = props.notifications.filter((n) => !n.read).length;

  // Inchide popover-ul dupa navigare — daca consumatorul nu blocheaza,
  // event-ul de click pe item inchide UI-ul.
  const listProps = {
    ...props,
    unreadCount,
    onItemClick: props.onItemClick
      ? (n: T) => {
          props.onItemClick?.(n);
          setOpen(false);
        }
      : undefined,
  };

  return (
    <>
      <BellButton unreadCount={unreadCount} onClick={() => setOpen(true)} label={props.labels.title} />

      <Sheet open={isMobile && open} onOpenChange={(v) => { if (isMobile) setOpen(v); }}>
        <SheetContent side="bottom" className="p-0 rounded-t-xl max-h-[85dvh] flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>{props.labels.title}</SheetTitle>
          </SheetHeader>
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>
          <div className="flex-1 overflow-hidden min-h-0">
            <NotificationList {...listProps} />
          </div>
        </SheetContent>
      </Sheet>

      <Popover open={!isMobile && open} onOpenChange={(v) => { if (!isMobile) setOpen(v); }}>
        <PopoverTrigger asChild>
          <span className="absolute" aria-hidden />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-[calc(100vw-2rem)] max-w-[380px] p-0 max-h-[480px] flex flex-col overflow-hidden"
          sideOffset={8}
        >
          <NotificationList {...listProps} />
        </PopoverContent>
      </Popover>
    </>
  );
}
