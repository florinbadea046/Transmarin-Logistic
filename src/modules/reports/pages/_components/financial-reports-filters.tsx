import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ── DatePicker ─────────────────────────────────────────────
export function DatePicker({ date, onSelect, placeholder }: {
  date: Date | undefined;
  onSelect: (d: Date | undefined) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd.MM.yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={(d) => { onSelect(d); setOpen(false); }} initialFocus />
      </PopoverContent>
    </Popover>
  );
}

// ── FinancialFilters ──────────────────────────────────────
export interface FinancialFiltersProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDate: (d: Date | undefined) => void;
  onEndDate: (d: Date | undefined) => void;
  tipFilter: string;
  onTipFilter: (v: string) => void;
  onReset: () => void;
  hasFilters: boolean;
  count: number;
  isMobile: boolean;
}

export function FinancialFilters({
  startDate,
  endDate,
  onStartDate,
  onEndDate,
  tipFilter,
  onTipFilter,
  onReset,
  hasFilters,
  count,
  isMobile,
}: FinancialFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className={cn("mb-6 flex gap-3", isMobile ? "flex-col" : "flex-wrap items-end")}>
      <div className={cn("space-y-1", isMobile ? "w-full" : "")}>
        <Label className="text-xs text-muted-foreground">{t("financialReports.from")}</Label>
        <DatePicker date={startDate} onSelect={onStartDate} placeholder={t("financialReports.pickDate")} />
      </div>
      <div className={cn("space-y-1", isMobile ? "w-full" : "")}>
        <Label className="text-xs text-muted-foreground">{t("financialReports.to")}</Label>
        <DatePicker date={endDate} onSelect={onEndDate} placeholder={t("financialReports.pickDate")} />
      </div>
      <div className={cn("space-y-1", isMobile ? "w-full" : "")}>
        <Label className="text-xs text-muted-foreground">{t("financialReports.typeFilter")}</Label>
        <Select value={tipFilter} onValueChange={onTipFilter}>
          <SelectTrigger className={isMobile ? "w-full" : "w-[180px]"}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="toate">{t("financialReports.allTypes")}</SelectItem>
            <SelectItem value="income">{t("financialReports.typeIncome")}</SelectItem>
            <SelectItem value="expense">{t("financialReports.typeExpense")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {hasFilters && (
        <Button variant="ghost" size="sm"
          onClick={onReset}
          className={isMobile ? "w-full" : "self-end"}>
          {t("financialReports.resetFilters")}
        </Button>
      )}
      <span className={cn("text-xs text-muted-foreground", !isMobile && "ml-auto self-end mb-1")}>
        {t("financialReports.invoiceCountLabel", { count })}
      </span>
    </div>
  );
}
