// ChartTooltip — wrapper peste Recharts Tooltip care aplica tema aplicatiei
// (fundal, border, text) pe toate tooltip-urile din chart-uri.
// Caller-ii isi pot pasa propriile props (formatter, labelFormatter etc.);
// contentStyle/labelStyle/itemStyle se imbogatesc cu stilurile temei.

import type { ComponentProps } from "react";
import { Tooltip } from "recharts";

type RechartsTooltipProps = ComponentProps<typeof Tooltip>;

const TOOLTIP_CONTENT_STYLE: React.CSSProperties = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "var(--radius)",
  color: "hsl(var(--popover-foreground))",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
  fontSize: 12,
  padding: "8px 10px",
};

const TOOLTIP_LABEL_STYLE: React.CSSProperties = {
  color: "hsl(var(--muted-foreground))",
  marginBottom: 4,
  fontWeight: 500,
};

const TOOLTIP_ITEM_STYLE: React.CSSProperties = {
  color: "hsl(var(--popover-foreground))",
};

const TOOLTIP_CURSOR = { fill: "hsl(var(--muted))", opacity: 0.3 } as const;

export function ChartTooltip({
  contentStyle,
  labelStyle,
  itemStyle,
  cursor,
  ...rest
}: RechartsTooltipProps) {
  return (
    <Tooltip
      cursor={cursor ?? TOOLTIP_CURSOR}
      contentStyle={{ ...TOOLTIP_CONTENT_STYLE, ...contentStyle }}
      labelStyle={{ ...TOOLTIP_LABEL_STYLE, ...labelStyle }}
      itemStyle={{ ...TOOLTIP_ITEM_STYLE, ...itemStyle }}
      {...rest}
    />
  );
}
