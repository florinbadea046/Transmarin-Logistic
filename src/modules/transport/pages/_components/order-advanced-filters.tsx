import * as React from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

function DateButton({
  date,
  placeholder,
  onSelect,
}: {
  date: Date | undefined;
  placeholder: string;
  onSelect: (d: Date | undefined) => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-8 w-full justify-start text-left text-sm font-normal sm:w-[150px]",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
          {date ? (
            <span className="tabular-nums">{format(date, "yyyy-MM-dd")}</span>
          ) : (
            placeholder
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        collisionPadding={20}
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            onSelect(d);
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export interface AdvancedFiltersProps {
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  origin: string;
  destination: string;
  onDateFrom: (d: Date | undefined) => void;
  onDateTo: (d: Date | undefined) => void;
  onOrigin: (v: string) => void;
  onDestination: (v: string) => void;
  onReset: () => void;
  hasActive: boolean;
}

export function AdvancedFilters({
  dateFrom,
  dateTo,
  origin,
  destination,
  onDateFrom,
  onDateTo,
  onOrigin,
  onDestination,
  onReset,
  hasActive,
}: AdvancedFiltersProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <DateButton
        date={dateFrom}
        placeholder={t("orders.filters.from")}
        onSelect={onDateFrom}
      />
      <DateButton
        date={dateTo}
        placeholder={t("orders.filters.to")}
        onSelect={onDateTo}
      />
      <Input
        value={origin}
        onChange={(e) => onOrigin(e.target.value)}
        placeholder={t("orders.placeholders.filterOrigin")}
        className="h-8 w-full sm:w-[140px]"
      />
      <Input
        value={destination}
        onChange={(e) => onDestination(e.target.value)}
        placeholder={t("orders.placeholders.filterDest")}
        className="h-8 w-full sm:w-[140px]"
      />
      {hasActive && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={onReset}
        >
          {t("orders.actions.reset")} <X className="ml-1 h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
