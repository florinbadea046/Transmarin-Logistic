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
  const [highlightedIndex, setHighlightedIndex] = React.useState<number | null>(
    null
  );
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

  const moveHighlight = (direction: 1 | -1) => {
    if (!options || options.length === 0) return;
    setHighlightedIndex((prev) => {
      const enabledOptions = options.filter((opt) => !opt.disabled);
      if (enabledOptions.length === 0) return null;
      const currentIndex =
        prev != null && options[prev] && !options[prev].disabled
          ? enabledOptions.findIndex(
              (opt) => String(opt.value) === String(options[prev!].value)
            )
          : enabledOptions.findIndex(
              (opt) => String(opt.value) === strValue
            );
      const startIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextEnabledIndex =
        (startIndex + direction + enabledOptions.length) %
        enabledOptions.length;
      const nextValue = enabledOptions[nextEnabledIndex].value;
      const absoluteIndex = options.findIndex(
        (opt) => String(opt.value) === String(nextValue)
      );
      return absoluteIndex >= 0 ? absoluteIndex : prev;
    });
  };

  const handleTriggerKeyDown: React.KeyboardEventHandler<HTMLButtonElement> = (
    e
  ) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        if (options && options.length > 0) {
          const selectedIndex =
            options.findIndex((opt) => String(opt.value) === strValue) ?? -1;
          setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
        }
      } else {
        moveHighlight(e.key === "ArrowDown" ? 1 : -1);
      }
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen((o) => !o);
    }
  };

  const handleListKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveHighlight(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveHighlight(-1);
    } else if (e.key === "Home") {
      e.preventDefault();
      if (options && options.length > 0) {
        const firstEnabled = options.findIndex((opt) => !opt.disabled);
        setHighlightedIndex(firstEnabled >= 0 ? firstEnabled : null);
      }
    } else if (e.key === "End") {
      e.preventDefault();
      if (options && options.length > 0) {
        const lastEnabled = [...options].reverse().findIndex((opt) => !opt.disabled);
        if (lastEnabled >= 0) {
          setHighlightedIndex(options.length - 1 - lastEnabled);
        }
      }
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (
        options &&
        highlightedIndex != null &&
        options[highlightedIndex] &&
        !options[highlightedIndex].disabled
      ) {
        handleSelect(options[highlightedIndex].value);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  React.useEffect(() => {
    if (open && options && options.length > 0) {
      const selectedIndex =
        options.findIndex((opt) => String(opt.value) === strValue) ?? -1;
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  }, [open, options, strValue]);

  React.useEffect(() => {
    if (open && listRef.current) {
      const indexToScroll = highlightedIndex != null ? highlightedIndex : -1;
      if (indexToScroll >= 0) {
        listRef.current.scrollTop = Math.max(
          0,
          indexToScroll * ITEM_HEIGHT - ITEM_HEIGHT * 2
        );
      }
      listRef.current.focus();
    }
  }, [open, highlightedIndex]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? "calendar-dropdown-list" : undefined}
        className="flex h-8 items-center gap-1 rounded-md border border-input bg-background px-2 text-sm font-medium hover:bg-accent"
      >
        {selectedOption?.label}
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>
      {open && (
        <div
          id="calendar-dropdown-list"
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={
            highlightedIndex != null && options && options[highlightedIndex]
              ? `calendar-dropdown-option-${String(options[highlightedIndex].value)}`
              : undefined
          }
          className="absolute top-full left-0 z-50 mt-1 min-w-full overflow-y-auto rounded-md border border-input bg-popover shadow-md"
          style={{ maxHeight: ITEM_HEIGHT * MAX_VISIBLE }}
          onWheel={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onKeyDown={handleListKeyDown}
        >
          {options?.map((opt, index) => {
            const isSelected = String(opt.value) === strValue;
            const isHighlighted = highlightedIndex === index;
            return (
              <div
                key={opt.value}
                id={`calendar-dropdown-option-${String(opt.value)}`}
                role="option"
                aria-selected={isSelected}
                className={cn(
                  "flex cursor-pointer items-center px-2 text-sm hover:bg-accent",
                  isSelected && "bg-primary text-primary-foreground",
                  isHighlighted && !isSelected && "bg-accent",
                  opt.disabled && "pointer-events-none opacity-50"
                )}
                style={{ height: ITEM_HEIGHT }}
                onClick={() => !opt.disabled && handleSelect(opt.value)}
              >
                {opt.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
