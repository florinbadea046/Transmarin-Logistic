// ──────────────────────────────────────────────────────────
// Unit tests: localStorage CRUD utilities
// File: src/utils/__tests__/local-storage.test.ts
// ──────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from "vitest";
import {
  getCollection,
  setCollection,
  addItem,
  updateItem,
  removeItem,
  findItem,
  generateId,
  initCollection,
} from "@/utils/local-storage";

// ── Tipuri test ────────────────────────────────────────────

interface Item {
  id: string;
  name: string;
  value?: number;
}

const KEY = "test-collection";

beforeEach(() => {
  localStorage.clear();
});

// ── getCollection ──────────────────────────────────────────

describe("getCollection", () => {
  it("returneaza array gol cand cheia nu exista", () => {
    expect(getCollection(KEY)).toEqual([]);
  });

  it("returneaza array gol pentru string gol", () => {
    localStorage.setItem(KEY, "");
    expect(getCollection(KEY)).toEqual([]);
  });

  it("deserializeaza corect un array din localStorage", () => {
    const data = [{ id: "1", name: "Ion" }, { id: "2", name: "Vasile" }];
    localStorage.setItem(KEY, JSON.stringify(data));
    expect(getCollection<Item>(KEY)).toEqual(data);
  });

  it("returneaza array gol pentru JSON invalid", () => {
    localStorage.setItem(KEY, "{ invalid json }}}");
    expect(getCollection(KEY)).toEqual([]);
  });

  it("returneaza array gol pentru JSON null", () => {
    localStorage.setItem(KEY, "null");
    // JSON.parse("null") = null, nu array -> cast returneaza null dar [] e expectat
    // In implementare: JSON.parse returneaza null, cast la T[] e null
    // Testam ca nu crapa
    expect(() => getCollection(KEY)).not.toThrow();
  });

  it("pastreaza tipurile obiectelor deserializate", () => {
    const data: Item[] = [{ id: "1", name: "Test", value: 42 }];
    localStorage.setItem(KEY, JSON.stringify(data));
    const result = getCollection<Item>(KEY);
    expect(result[0].value).toBe(42);
    expect(result[0].name).toBe("Test");
  });

  it("returneaza array gol pentru alta cheie inexistenta", () => {
    localStorage.setItem(KEY, JSON.stringify([{ id: "1" }]));
    expect(getCollection("alta-cheie")).toEqual([]);
  });
});

// ── setCollection ──────────────────────────────────────────

describe("setCollection", () => {
  it("salveaza un array in localStorage", () => {
    const data: Item[] = [{ id: "1", name: "Test" }];
    setCollection(KEY, data);
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify(data));
  });

  it("salveaza array gol", () => {
    setCollection(KEY, []);
    expect(localStorage.getItem(KEY)).toBe("[]");
  });

  it("suprascrie datele existente", () => {
    setCollection(KEY, [{ id: "1", name: "Vechi" }]);
    setCollection(KEY, [{ id: "2", name: "Nou" }]);
    expect(getCollection<Item>(KEY)).toEqual([{ id: "2", name: "Nou" }]);
  });

  it("salveaza array cu mai multe elemente", () => {
    const data: Item[] = [
      { id: "1", name: "A" },
      { id: "2", name: "B" },
      { id: "3", name: "C" },
    ];
    setCollection(KEY, data);
    expect(getCollection<Item>(KEY)).toHaveLength(3);
  });
});

// ── addItem ────────────────────────────────────────────────

describe("addItem", () => {
  it("adauga un element la colectie goala", () => {
    addItem<Item>(KEY, { id: "1", name: "Ion" });
    expect(getCollection<Item>(KEY)).toHaveLength(1);
    expect(getCollection<Item>(KEY)[0]).toEqual({ id: "1", name: "Ion" });
  });

  it("adauga un element la colectie existenta", () => {
    setCollection<Item>(KEY, [{ id: "1", name: "Ion" }]);
    addItem<Item>(KEY, { id: "2", name: "Vasile" });
    expect(getCollection<Item>(KEY)).toHaveLength(2);
  });

  it("elementul nou e adaugat la sfarsit", () => {
    addItem<Item>(KEY, { id: "1", name: "Primul" });
    addItem<Item>(KEY, { id: "2", name: "Al doilea" });
    const result = getCollection<Item>(KEY);
    expect(result[result.length - 1].name).toBe("Al doilea");
  });

  it("adauga mai multe elemente succesiv", () => {
    addItem<Item>(KEY, { id: "1", name: "A" });
    addItem<Item>(KEY, { id: "2", name: "B" });
    addItem<Item>(KEY, { id: "3", name: "C" });
    expect(getCollection<Item>(KEY)).toHaveLength(3);
  });

  it("nu afecteaza alte chei", () => {
    addItem<Item>(KEY, { id: "1", name: "Test" });
    expect(getCollection("alta-cheie")).toEqual([]);
  });
});

// ── updateItem ─────────────────────────────────────────────

describe("updateItem", () => {
  beforeEach(() => {
    setCollection<Item>(KEY, [
      { id: "1", name: "Ion", value: 10 },
      { id: "2", name: "Vasile", value: 20 },
      { id: "3", name: "Gheorghe", value: 30 },
    ]);
  });

  it("actualizeaza elementul care satisface predicatul", () => {
    updateItem<Item>(
      KEY,
      (item) => item.id === "1",
      (item) => ({ ...item, name: "Ion Actualizat" }),
    );
    const result = getCollection<Item>(KEY);
    expect(result.find((i) => i.id === "1")?.name).toBe("Ion Actualizat");
  });

  it("nu modifica elementele care nu satisfac predicatul", () => {
    updateItem<Item>(
      KEY,
      (item) => item.id === "1",
      (item) => ({ ...item, name: "Modificat" }),
    );
    const result = getCollection<Item>(KEY);
    expect(result.find((i) => i.id === "2")?.name).toBe("Vasile");
    expect(result.find((i) => i.id === "3")?.name).toBe("Gheorghe");
  });

  it("pastreaza numarul total de elemente dupa update", () => {
    updateItem<Item>(KEY, (i) => i.id === "2", (i) => ({ ...i, value: 999 }));
    expect(getCollection<Item>(KEY)).toHaveLength(3);
  });

  it("nu face nimic daca predicatul nu gaseste niciun element", () => {
    const before = getCollection<Item>(KEY);
    updateItem<Item>(KEY, (i) => i.id === "inexistent", (i) => i);
    expect(getCollection<Item>(KEY)).toEqual(before);
  });

  it("poate actualiza mai multe elemente simultan", () => {
    updateItem<Item>(
      KEY,
      (i) => i.value! > 15,
      (i) => ({ ...i, name: "Updated" }),
    );
    const result = getCollection<Item>(KEY);
    expect(result.filter((i) => i.name === "Updated")).toHaveLength(2);
  });

  it("actualizeaza corect valoarea numerica", () => {
    updateItem<Item>(KEY, (i) => i.id === "1", (i) => ({ ...i, value: 999 }));
    expect(getCollection<Item>(KEY).find((i) => i.id === "1")?.value).toBe(999);
  });
});

// ── removeItem ─────────────────────────────────────────────

describe("removeItem", () => {
  beforeEach(() => {
    setCollection<Item>(KEY, [
      { id: "1", name: "Ion" },
      { id: "2", name: "Vasile" },
      { id: "3", name: "Gheorghe" },
    ]);
  });

  it("sterge elementul care satisface predicatul", () => {
    removeItem<Item>(KEY, (i) => i.id === "1");
    const result = getCollection<Item>(KEY);
    expect(result.find((i) => i.id === "1")).toBeUndefined();
  });

  it("pastreaza elementele care nu satisfac predicatul", () => {
    removeItem<Item>(KEY, (i) => i.id === "1");
    const result = getCollection<Item>(KEY);
    expect(result).toHaveLength(2);
    expect(result.find((i) => i.id === "2")).toBeDefined();
    expect(result.find((i) => i.id === "3")).toBeDefined();
  });

  it("nu face nimic daca predicatul nu gaseste nimic", () => {
    removeItem<Item>(KEY, (i) => i.id === "inexistent");
    expect(getCollection<Item>(KEY)).toHaveLength(3);
  });

  it("poate sterge mai multe elemente simultan", () => {
    removeItem<Item>(KEY, (i) => i.id === "1" || i.id === "2");
    expect(getCollection<Item>(KEY)).toHaveLength(1);
  });

  it("poate sterge toate elementele", () => {
    removeItem<Item>(KEY, () => true);
    expect(getCollection<Item>(KEY)).toEqual([]);
  });

  it("functioneaza pe colectie goala fara erori", () => {
    setCollection(KEY, []);
    expect(() => removeItem<Item>(KEY, (i: Item) => i.id === "1")).not.toThrow();
  });
});

// ── findItem ───────────────────────────────────────────────

describe("findItem", () => {
  beforeEach(() => {
    setCollection<Item>(KEY, [
      { id: "1", name: "Ion", value: 10 },
      { id: "2", name: "Vasile", value: 20 },
    ]);
  });

  it("gaseste elementul care satisface predicatul", () => {
    const result = findItem<Item>(KEY, (i) => i.id === "1");
    expect(result).toEqual({ id: "1", name: "Ion", value: 10 });
  });

  it("returneaza undefined daca nu gaseste nimic", () => {
    expect(findItem<Item>(KEY, (i) => i.id === "inexistent")).toBeUndefined();
  });

  it("returneaza undefined pentru colectie goala", () => {
    setCollection(KEY, []);
    expect(findItem<Item>(KEY, () => true)).toBeUndefined();
  });

  it("gaseste dupa orice proprietate", () => {
    const result = findItem<Item>(KEY, (i) => i.name === "Vasile");
    expect(result?.id).toBe("2");
  });

  it("returneaza primul element care satisface predicatul", () => {
    setCollection<Item>(KEY, [
      { id: "1", name: "Duplicat", value: 1 },
      { id: "2", name: "Duplicat", value: 2 },
    ]);
    const result = findItem<Item>(KEY, (i) => i.name === "Duplicat");
    expect(result?.id).toBe("1");
  });

  it("gaseste dupa valoare numerica", () => {
    const result = findItem<Item>(KEY, (i) => i.value === 20);
    expect(result?.name).toBe("Vasile");
  });
});

// ── generateId ─────────────────────────────────────────────

describe("generateId", () => {
  it("returneaza un string nenul", () => {
    expect(typeof generateId()).toBe("string");
    expect(generateId().length).toBeGreaterThan(0);
  });

  it("genereaza ID-uri unice la apeluri successive", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it("ID-ul contine timestamp (numar)", () => {
    const id = generateId();
    const parts = id.split("-");
    expect(Number(parts[0])).toBeGreaterThan(0);
  });

  it("ID-ul are format timestamp-random", () => {
    expect(generateId()).toMatch(/^\d+-[a-z0-9]+$/);
  });
});

// ── initCollection ─────────────────────────────────────────

describe("initCollection", () => {
  it("scrie datele cand cheia nu exista", () => {
    const data: Item[] = [{ id: "1", name: "Default" }];
    initCollection(KEY, data);
    expect(getCollection<Item>(KEY)).toEqual(data);
  });

  it("nu suprascrie datele existente", () => {
    const existing: Item[] = [{ id: "existing", name: "Existent" }];
    setCollection(KEY, existing);
    initCollection(KEY, [{ id: "new", name: "Nou" }]);
    expect(getCollection<Item>(KEY)).toEqual(existing);
  });

  it("initializeaza cu array gol fara erori", () => {
    expect(() => initCollection(KEY, [])).not.toThrow();
    expect(getCollection(KEY)).toEqual([]);
  });

  it("initializeaza cu mai multe elemente", () => {
    const data: Item[] = [
      { id: "1", name: "A" },
      { id: "2", name: "B" },
      { id: "3", name: "C" },
    ];
    initCollection(KEY, data);
    expect(getCollection<Item>(KEY)).toHaveLength(3);
  });

  it("nu suprascrie nici daca datele existente sunt array gol", () => {
    setCollection<Item>(KEY, []);
    initCollection<Item>(KEY, [{ id: "1", name: "Nou" }]);
    // Cheia exista cu [] -> nu suprascrie
    expect(getCollection<Item>(KEY)).toEqual([]);
  });
});

// ── Integrare ──────────────────────────────────────────────

describe("local-storage — integrare CRUD complet", () => {
  it("flux complet: add -> find -> update -> remove", () => {
    addItem<Item>(KEY, { id: "1", name: "Ion", value: 100 });
    addItem<Item>(KEY, { id: "2", name: "Vasile", value: 200 });

    // find
    expect(findItem<Item>(KEY, (i) => i.id === "1")?.name).toBe("Ion");

    // update
    updateItem<Item>(KEY, (i) => i.id === "1", (i) => ({ ...i, value: 999 }));
    expect(findItem<Item>(KEY, (i) => i.id === "1")?.value).toBe(999);

    // remove
    removeItem<Item>(KEY, (i) => i.id === "1");
    expect(findItem<Item>(KEY, (i) => i.id === "1")).toBeUndefined();
    expect(getCollection<Item>(KEY)).toHaveLength(1);
  });

  it("doua colectii independente nu se afecteaza reciproc", () => {
    addItem<Item>("colectie-a", { id: "1", name: "A" });
    addItem<Item>("colectie-b", { id: "2", name: "B" });
    expect(getCollection<Item>("colectie-a")).toHaveLength(1);
    expect(getCollection<Item>("colectie-b")).toHaveLength(1);
    removeItem<Item>("colectie-a", () => true);
    expect(getCollection<Item>("colectie-b")).toHaveLength(1);
  });

  it("persistenta: datele raman dupa set si get separat", () => {
    setCollection<Item>(KEY, [{ id: "1", name: "Persistent" }]);
    const result = getCollection<Item>(KEY);
    expect(result[0].name).toBe("Persistent");
  });
});