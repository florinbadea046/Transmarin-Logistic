import type { ComponentProps } from "react";
import type { Root, Content, Trigger } from "@radix-ui/react-popover";
import { CircleQuestionMark } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type LearnMoreProps = ComponentProps<typeof Root> & {
  contentProps?: ComponentProps<typeof Content>;
  triggerProps?: ComponentProps<typeof Trigger>;
};

export function LearnMore({
  children,
  contentProps,
  triggerProps,
  ...props
}: LearnMoreProps) {
  return (
    <Popover {...props}>
      <PopoverTrigger
        asChild
        {...triggerProps}
        className={cn("size-5 rounded-full", triggerProps?.className)}
      >
        <Button variant="outline" size="icon">
          <span className="sr-only">Learn more</span>
          <CircleQuestionMark className="size-4 [&>circle]:hidden" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="start"
        {...contentProps}
        className={cn("text-sm text-muted-foreground", contentProps?.className)}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
