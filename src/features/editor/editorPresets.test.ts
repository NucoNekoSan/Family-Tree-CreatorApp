import { describe, expect, it } from "vitest";
import { findPartnerIds, quickDirection } from "./editorPresets";
import type { FamilyNodeData } from "../../familyGraph";

const node = (id: string, data: Partial<FamilyNodeData> = {}) =>
  ({
    id,
    data: { anchorNodeId: null, relationKind: "self", ...data },
  }) as never;

describe("editor presets", () => {
  it("finds both directions of partner links", () => {
    const nodes = [
      node("self"),
      node("partner", { anchorNodeId: "self", relationKind: "partner" }),
      node("reverse", { anchorNodeId: "self", relationKind: "divorce" }),
    ];
    expect(findPartnerIds("self", nodes)).toEqual(["partner", "reverse"]);
  });

  it("alternates partner placement and uses fixed family directions", () => {
    const nodes = [node("self")];
    expect(quickDirection({ kind: "parent", anchorId: "self" }, nodes)).toBe(
      "above",
    );
    expect(quickDirection({ kind: "child", anchorId: "self" }, nodes)).toBe(
      "below",
    );
    expect(quickDirection({ kind: "partner", anchorId: "self" }, nodes)).toBe(
      "right",
    );
    nodes.push(
      node("partner", { anchorNodeId: "self", relationKind: "partner" }),
    );
    expect(quickDirection({ kind: "partner", anchorId: "self" }, nodes)).toBe(
      "left",
    );
  });
});
