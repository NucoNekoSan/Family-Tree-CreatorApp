import { describe, expect, it } from "vitest";
import type { CohabitationStorage } from "./cohabitationStorage";
import {
  cohabitationDocumentKey,
  legacyCohabitationLabelsKey,
  legacyCohabitationsKey,
  loadCohabitationDocument,
  saveCohabitationDocument,
} from "./cohabitationStorage";
import { emptyCohabitationDocument } from "./cohabitationModel";

const memoryStorage = () => {
  const values = new Map<string, string>();
  const storage: CohabitationStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  };
  return { values, storage };
};

describe("cohabitation storage", () => {
  it("migrates valid legacy arrays into the v1 document", () => {
    const { values, storage } = memoryStorage();
    values.set(
      legacyCohabitationsKey("a"),
      JSON.stringify([
        {
          id: "group",
          nodeIds: ["one", "two"],
          label: "同居",
          fontSize: 20,
          cx: 10,
          cy: 20,
          rx: 30,
          ry: 40,
        },
      ]),
    );
    values.set(
      legacyCohabitationLabelsKey("a"),
      JSON.stringify([{ id: "label", x: 1, y: 2, fontSize: 20 }]),
    );

    const result = loadCohabitationDocument("a", storage);
    expect(result.version).toBe(1);
    expect(result.cohabitations).toHaveLength(1);
    expect(result.labels).toHaveLength(1);
    expect(values.has(cohabitationDocumentKey("a"))).toBe(true);
    expect(values.has(legacyCohabitationsKey("a"))).toBe(false);
  });

  it("returns an empty document for malformed data and storage errors", () => {
    const broken: CohabitationStorage = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    };
    expect(loadCohabitationDocument("a", broken)).toEqual(
      emptyCohabitationDocument(),
    );
    expect(
      saveCohabitationDocument("a", emptyCohabitationDocument(), broken),
    ).toBe(false);
  });

  it("persists an empty document so deleting the last item sticks", () => {
    const { values, storage } = memoryStorage();
    expect(
      saveCohabitationDocument("a", emptyCohabitationDocument(), storage),
    ).toBe(true);
    expect(JSON.parse(values.get(cohabitationDocumentKey("a"))!)).toEqual(
      emptyCohabitationDocument(),
    );
  });
});
