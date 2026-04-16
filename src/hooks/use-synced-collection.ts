// useSyncedCollection — hook canonic pentru colectiile persistate in localStorage.
//
// Inlocuieste pattern-ul "useState(() => getCollection(KEY))" scris in fiecare
// pagina. Beneficii:
//   - Cross-tab sync: asculta `storage` event si reincarca automat cand alta fila
//     modifica cheia.
//   - Intra-tab sync: orice scriere prin `@/utils/local-storage` (setCollection,
//     addItem, updateItem, removeItem) emite `transmarin:storage`, deci toate
//     componentele montate in acelasi tab se actualizeaza automat.
//   - Repository API: `save(items)` scrie + notifica; `refresh()` re-citeste.
//
// Pentru operatii granulare folosesc `addItem/updateItem/removeItem` — vor
// declansa reactualizarea automat.

import { useCallback, useEffect, useState } from "react";
import { getCollection, setCollection } from "@/utils/local-storage";

/** Numele evenimentului intra-tab emis de helperele din utils/local-storage. */
const LOCAL_CHANGE_EVENT = "transmarin:storage";

export interface SyncedCollection<T> {
  items: T[];
  save: (next: T[]) => void;
  refresh: () => void;
}

export function useSyncedCollection<T>(key: string): SyncedCollection<T> {
  const [items, setItems] = useState<T[]>(() => getCollection<T>(key));

  const refresh = useCallback(() => {
    setItems(getCollection<T>(key));
  }, [key]);

  const save = useCallback(
    (next: T[]) => {
      setItems(next);
      setCollection(key, next);
    },
    [key],
  );

  useEffect(() => {
    refresh();

    const onStorage = (e: StorageEvent) => {
      if (e.key === key) refresh();
    };
    const onLocal = (e: Event) => {
      const detail = (e as CustomEvent<{ key: string }>).detail;
      if (detail?.key === key) refresh();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(LOCAL_CHANGE_EVENT, onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(LOCAL_CHANGE_EVENT, onLocal);
    };
  }, [key, refresh]);

  return { items, save, refresh };
}
