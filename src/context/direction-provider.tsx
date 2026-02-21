import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Dir = "ltr" | "rtl";

type DirectionContextValue = {
  defaultDir: Dir;
  dir: Dir;
  setDir: (dir: Dir) => void;
  resetDir: () => void;
};

const DirectionContext = createContext<DirectionContextValue | null>(null);
const STORAGE_KEY = "ui_dir";
const DEFAULT_DIR: Dir = "ltr";

function applyDir(dir: Dir) {
  document.documentElement.dir = dir;
}

export function DirectionProvider({ children }: { children: ReactNode }) {
  const [dir, setDirState] = useState<Dir>(() => {
    if (typeof window === "undefined") return DEFAULT_DIR;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "ltr" || saved === "rtl" ? saved : DEFAULT_DIR;
  });

  const setDir = useCallback((d: Dir) => {
    setDirState(d);
    window.localStorage.setItem(STORAGE_KEY, d);
    applyDir(d);
  }, []);

  const resetDir = useCallback(() => {
    setDir(DEFAULT_DIR);
  }, [setDir]);

  useEffect(() => {
    applyDir(dir);
  }, [dir]);

  const value = useMemo<DirectionContextValue>(
    () => ({
      defaultDir: DEFAULT_DIR,
      dir,
      setDir,
      resetDir,
    }),
    [dir, setDir, resetDir],
  );

  return (
    <DirectionContext.Provider value={value}>
      {children}
    </DirectionContext.Provider>
  );
}

export function useDirection() {
  const ctx = useContext(DirectionContext);
  if (!ctx)
    throw new Error("useDirection must be used within DirectionProvider");
  return ctx;
}
