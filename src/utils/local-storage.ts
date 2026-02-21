// ──────────────────────────────────────────────────────────
// Helpers pentru localStorage — tot CRUD-ul din aplicație
// folosește localStorage ca "bază de date" (conform proiectului).
//
// Studenții vor folosi aceste funcții în fiecare modul.
// ──────────────────────────────────────────────────────────

/**
 * Citește și parsează un array din localStorage.
 * Returnează [] dacă cheia nu există.
 */
export function getCollection<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

/**
 * Salvează un array în localStorage.
 */
export function setCollection<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

/**
 * Adaugă un element la colecție.
 */
export function addItem<T>(key: string, item: T): void {
  const collection = getCollection<T>(key);
  collection.push(item);
  setCollection(key, collection);
}

/**
 * Actualizează un element după predicat.
 */
export function updateItem<T>(
  key: string,
  predicate: (item: T) => boolean,
  updater: (item: T) => T,
): void {
  const collection = getCollection<T>(key);
  const updated = collection.map((item) =>
    predicate(item) ? updater(item) : item,
  );
  setCollection(key, updated);
}

/**
 * Șterge elemente care satisfac predicatul.
 */
export function removeItem<T>(
  key: string,
  predicate: (item: T) => boolean,
): void {
  const collection = getCollection<T>(key);
  setCollection(
    key,
    collection.filter((item) => !predicate(item)),
  );
}

/**
 * Găsește un element după predicat.
 */
export function findItem<T>(
  key: string,
  predicate: (item: T) => boolean,
): T | undefined {
  return getCollection<T>(key).find(predicate);
}

/**
 * Generează un ID unic simplu (pentru date mock).
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Inițializează o colecție doar dacă nu există deja.
 * Util pentru seed-ul inițial de date mock.
 */
export function initCollection<T>(key: string, defaultData: T[]): void {
  if (!localStorage.getItem(key)) {
    setCollection(key, defaultData);
  }
}
