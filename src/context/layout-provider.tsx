import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type LayoutMode = "default" | "compact" | "full";
export type Collapsible = "icon" | "offcanvas" | "none";

type LayoutContextValue = {
  defaultLayout: LayoutMode;
  layout: LayoutMode;
  setLayout: (layout: LayoutMode) => void;
  defaultCollapsible: Collapsible;
  collapsible: Collapsible;
  setCollapsible: (c: Collapsible) => void;
  defaultFixed: boolean;
  fixed: boolean;
  setFixed: (v: boolean) => void;
  resetLayout: () => void;
};

const LayoutContext = createContext<LayoutContextValue | null>(null);
const STORAGE_KEY = "ui_layout";

type Stored = {
  layout: LayoutMode;
  collapsible: Collapsible;
  fixed: boolean;
};

const defaults: Stored = {
  layout: "default",
  collapsible: "icon",
  fixed: false,
};

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Stored>(() => {
    if (typeof window === "undefined") return defaults;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaults;
      return { ...defaults, ...(JSON.parse(raw) as Partial<Stored>) };
    } catch {
      return defaults;
    }
  });

  const setLayout = useCallback((layout: LayoutMode) => {
    setState((s) => ({ ...s, layout }));
  }, []);

  const setCollapsible = useCallback((collapsible: Collapsible) => {
    setState((s) => ({ ...s, collapsible }));
  }, []);

  const setFixed = useCallback((fixed: boolean) => {
    setState((s) => ({ ...s, fixed }));
  }, []);

  const resetLayout = useCallback(() => {
    setState(defaults);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const value = useMemo<LayoutContextValue>(
    () => ({
      defaultLayout: defaults.layout,
      layout: state.layout,
      setLayout,
      defaultCollapsible: defaults.collapsible,
      collapsible: state.collapsible,
      setCollapsible,
      defaultFixed: defaults.fixed,
      fixed: state.fixed,
      setFixed,
      resetLayout,
    }),
    [state, setLayout, setCollapsible, setFixed, resetLayout],
  );

  return (
    <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
  );
}

export function useLayout() {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error("useLayout must be used within LayoutProvider");
  return ctx;
}
