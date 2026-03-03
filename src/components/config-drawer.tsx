import type { ReactElement, SVGProps } from "react";
import { Root as Radio, Item } from "@radix-ui/react-radio-group";
import { CircleCheck, RotateCcw, Settings } from "lucide-react";
import { IconDir } from "@/assets/custom/icon-dir";
import { IconLayoutCompact } from "@/assets/custom/icon-layout-compact";
import { IconLayoutDefault } from "@/assets/custom/icon-layout-default";
import { IconLayoutFull } from "@/assets/custom/icon-layout-full";
import { IconThemeDark } from "@/assets/custom/icon-theme-dark";
import { IconThemeLight } from "@/assets/custom/icon-theme-light";
import { IconThemeSystem } from "@/assets/custom/icon-theme-system";
import { cn } from "@/lib/utils";
import { useDirection } from "@/context/direction-provider";
import {
  type Collapsible,
  type LayoutMode,
  useLayout,
} from "@/context/layout-provider";
import { useTheme } from "@/context/theme-provider";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSidebar } from "./ui/sidebar";

export function ConfigDrawer() {
  const { setOpen } = useSidebar();
  const { resetDir } = useDirection();
  const { resetTheme } = useTheme();
  const { resetLayout } = useLayout();

  const handleReset = () => {
    setOpen(true);
    resetDir();
    resetTheme();
    resetLayout();
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Open theme settings"
          aria-describedby="config-drawer-description"
          className="rounded-full"
        >
          <Settings aria-hidden="true" />
        </Button>
      </SheetTrigger>

      <SheetContent className="flex flex-col">
        <SheetHeader className="pb-0 text-start">
          <SheetTitle>Theme Settings</SheetTitle>
          <SheetDescription id="config-drawer-description">
            Adjust the appearance and layout to suit your preferences.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 overflow-y-auto px-4">
          <ThemeConfig />
          <LayoutModeConfig />
          <CollapsibleConfig />
          <DirConfig />
        </div>

        <SheetFooter className="gap-2">
          <Button
            variant="destructive"
            onClick={handleReset}
            aria-label="Reset all settings to default values"
          >
            Reset
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function SectionTitle({
  title,
  showReset = false,
  onReset,
  className,
}: {
  title: string;
  showReset?: boolean;
  onReset?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground",
        className,
      )}
    >
      {title}
      {showReset && onReset && (
        <Button
          size="icon"
          variant="secondary"
          className="size-4 rounded-full"
          onClick={onReset}
        >
          <RotateCcw className="size-3" />
        </Button>
      )}
    </div>
  );
}

function RadioGroupItem({
  item,
  isTheme = false,
}: {
  item: {
    value: string;
    label: string;
    icon: (props: SVGProps<SVGSVGElement>) => ReactElement;
  };
  isTheme?: boolean;
}) {
  return (
    <Item
      value={item.value}
      className={cn("group outline-none", "transition duration-200 ease-in")}
      aria-label={`Select ${item.label.toLowerCase()}`}
      aria-describedby={`${item.value}-description`}
    >
      <div
        className={cn(
          "relative rounded-[6px] ring-[1px] ring-border",
          "group-data-[state=checked]:shadow-2xl group-data-[state=checked]:ring-primary",
          "group-focus-visible:ring-2",
        )}
        role="img"
        aria-hidden="false"
        aria-label={`${item.label} option preview`}
      >
        <CircleCheck
          className={cn(
            "size-6 fill-primary stroke-white",
            "group-data-[state=unchecked]:hidden",
            "absolute right-0 top-0 translate-x-1/2 -translate-y-1/2",
          )}
          aria-hidden="true"
        />
        <item.icon
          className={cn(
            !isTheme &&
              "fill-primary stroke-primary group-data-[state=unchecked]:fill-muted-foreground group-data-[state=unchecked]:stroke-muted-foreground",
          )}
          aria-hidden="true"
        />
      </div>

      <div
        className="mt-1 text-xs"
        id={`${item.value}-description`}
        aria-live="polite"
      >
        {item.label}
      </div>
    </Item>
  );
}

function ThemeConfig() {
  const { defaultTheme, theme, setTheme } = useTheme();

  return (
    <div>
      <SectionTitle
        title="Theme"
        showReset={theme !== defaultTheme}
        onReset={() => setTheme(defaultTheme)}
      />

      <Radio
        value={theme}
        onValueChange={setTheme}
        className="grid w-full max-w-md grid-cols-3 gap-4"
        aria-label="Select theme preference"
        aria-describedby="theme-description"
      >
        {[
          { value: "system", label: "System", icon: IconThemeSystem },
          { value: "light", label: "Light", icon: IconThemeLight },
          { value: "dark", label: "Dark", icon: IconThemeDark },
        ].map((item) => (
          <RadioGroupItem key={item.value} item={item} isTheme />
        ))}
      </Radio>

      <div id="theme-description" className="sr-only">
        Choose between system preference, light mode, or dark mode
      </div>
    </div>
  );
}

function LayoutModeConfig() {
  const { defaultLayout, layout, setLayout } = useLayout();

  return (
    <div className="max-md:hidden">
      <SectionTitle
        title="Layout Mode"
        showReset={defaultLayout !== layout}
        onReset={() => setLayout(defaultLayout)}
      />

      <Radio
        value={layout}
        onValueChange={(v) => setLayout(v as LayoutMode)}
        className="grid w-full max-w-md grid-cols-3 gap-4"
        aria-label="Select layout mode"
        aria-describedby="layout-mode-description"
      >
        {[
          { value: "default", label: "Default", icon: IconLayoutDefault },
          { value: "compact", label: "Compact", icon: IconLayoutCompact },
          { value: "full", label: "Full", icon: IconLayoutFull },
        ].map((item) => (
          <RadioGroupItem key={item.value} item={item} />
        ))}
      </Radio>

      <div id="layout-mode-description" className="sr-only">
        Choose between default, compact, or full layout mode
      </div>
    </div>
  );
}

function CollapsibleConfig() {
  const { defaultCollapsible, collapsible, setCollapsible } = useLayout();

  return (
    <div className="max-md:hidden">
      <SectionTitle
        title="Sidebar Collapse"
        showReset={defaultCollapsible !== collapsible}
        onReset={() => setCollapsible(defaultCollapsible)}
      />

      <Radio
        value={collapsible}
        onValueChange={(v) => setCollapsible(v as Collapsible)}
        className="grid w-full max-w-md grid-cols-3 gap-4"
        aria-label="Select sidebar collapse behavior"
        aria-describedby="collapsible-description"
      >
        {[
          { value: "icon", label: "Icon", icon: IconLayoutCompact },
          { value: "offcanvas", label: "Offcanvas", icon: IconLayoutFull },
          { value: "none", label: "None", icon: IconLayoutDefault },
        ].map((item) => (
          <RadioGroupItem key={item.value} item={item} />
        ))}
      </Radio>

      <div id="collapsible-description" className="sr-only">
        Choose icon-only, offcanvas, or no collapsing behavior
      </div>
    </div>
  );
}

function DirConfig() {
  const { defaultDir, dir, setDir } = useDirection();

  return (
    <div>
      <SectionTitle
        title="Direction"
        showReset={defaultDir !== dir}
        onReset={() => setDir(defaultDir)}
      />

      <Radio
        value={dir}
        onValueChange={setDir}
        className="grid w-full max-w-md grid-cols-2 gap-4"
        aria-label="Select site direction"
        aria-describedby="direction-description"
      >
        {[
          {
            value: "ltr",
            label: "Left to Right",
            icon: (props: SVGProps<SVGSVGElement>) => (
              <IconDir dir="ltr" {...props} />
            ),
          },
          {
            value: "rtl",
            label: "Right to Left",
            icon: (props: SVGProps<SVGSVGElement>) => (
              <IconDir dir="rtl" {...props} />
            ),
          },
        ].map((item) => (
          <RadioGroupItem key={item.value} item={item} />
        ))}
      </Radio>

      <div id="direction-description" className="sr-only">
        Choose between left-to-right or right-to-left site direction
      </div>
    </div>
  );
}
