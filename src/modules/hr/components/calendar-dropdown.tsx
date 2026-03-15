import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const ITEM_HEIGHT = 32;
export const MAX_VISIBLE = 5;

export function CalendarDropdown({
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
    const event = { target: { value: String(optValue) } } as React.ChangeEvent<HTMLSelectElement>;
    onChange?.(event);
    setOpen(false);
  };

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  React.useEffect(() => {
    if (open && listRef.current) {
      const idx = options?.findIndex((opt) => String(opt.value) === strValue) ?? -1;
      if (idx >= 0) listRef.current.scrollTop = Math.max(0, idx * ITEM_HEIGHT - ITEM_HEIGHT * 2);
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
                String(opt.value) === strValue && "bg-primary text-primary-foreground",
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
