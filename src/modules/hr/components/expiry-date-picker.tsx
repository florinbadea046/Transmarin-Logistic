import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const ITEM_HEIGHT = 32;
const MAX_VISIBLE = 5;

function CalendarDropdown({
  value,
  onChange,
  options,
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  options?: Array<{ value: string | number; label: string; disabled?: boolean }>;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const strValue = Array.isArray(value) ? String(value[0]) : String(value);
  const selectedOption = options?.find((opt) => String(opt.value) === strValue);

  const handleSelect = (optValue: string | number) => {
    const event = {
      target: { value: String(optValue) },
    } as React.ChangeEvent<HTMLSelectElement>;
    onChange?.(event);
    setOpen(false);
  };

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (open && listRef.current) {
      const selectedIndex =
        options?.findIndex((opt) => String(opt.value) === strValue) ?? -1;
      if (selectedIndex >= 0) {
        listRef.current.scrollTop = Math.max(
          0,
          selectedIndex * ITEM_HEIGHT - ITEM_HEIGHT * 2
        );
      }
    }
  }, [open, value, options, strValue]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 items-center gap-1 rounded-md border border-input bg-background px-2 text-sm font-medium hover:bg-accent"
      >
        {selectedOption?.label}
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>
      {open && (
        <div
          ref={listRef}
          className="absolute top-full left-0 z-50 mt-1 min-w-full overflow-y-auto rounded-md border border-input bg-popover shadow-md"
          style={{ maxHeight: ITEM_HEIGHT * MAX_VISIBLE }}
          onWheel={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {options?.map((opt) => (
            <div
              key={opt.value}
              className={cn(
                "flex cursor-pointer items-center px-2 text-sm hover:bg-accent",
                String(opt.value) === strValue &&
                  "bg-primary text-primary-foreground",
                opt.disabled && "pointer-events-none opacity-50"
              )}
              style={{ height: ITEM_HEIGHT }}
              onClick={() => !opt.disabled && handleSelect(opt.value)}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type Props = {
  selected: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  placeholder?: string;
};

export function ExpiryDatePicker({
  selected,
  onSelect,
  placeholder = "Pick a date",
}: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-empty={!selected}
          className="w-full justify-start text-start font-normal data-[empty=true]:text-muted-foreground"
        >
          {selected ? (
            format(selected, "MMM d, yyyy")
          ) : (
            <span>{placeholder}</span>
          )}
          <CalendarIcon className="ms-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={selected}
          onSelect={onSelect}
          endMonth={new Date(new Date().getFullYear() + 20, 11)}
          disabled={(date: Date) => date < new Date("1900-01-01")}
          components={{ Dropdown: CalendarDropdown }}
        />
      </PopoverContent>
    </Popover>
  );
}
