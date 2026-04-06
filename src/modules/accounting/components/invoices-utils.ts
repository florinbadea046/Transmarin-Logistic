export const STORAGE_KEY = "invoices";

export const getCollection = <T>(seed: T[]): T[] => {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return seed;
  }
};

export const setCollection = <T>(data: T[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const initCollection = <T>(seed: T[]) => {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  }
};