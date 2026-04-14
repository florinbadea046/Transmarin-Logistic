import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  onChange,
  readonly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "h-4 w-4",
            i <= value
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground/30",
            !readonly && "cursor-pointer hover:text-yellow-400",
          )}
          onClick={() => !readonly && onChange?.(i)}
        />
      ))}
    </div>
  );
}
