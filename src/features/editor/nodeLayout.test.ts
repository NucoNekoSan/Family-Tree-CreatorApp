import { describe, expect, it } from "vitest";
import type { Node } from "@xyflow/react";
import type { FamilyNodeData } from "../../familyGraph";
import { clampNodeToFrame, normalizeNodesToFrame } from "./nodeLayout";

const data = (
  relationKind: FamilyNodeData["relationKind"],
): FamilyNodeData => ({
  relationshipId: relationKind,
  relationshipName: relationKind,
  relationKind,
  lineStyle: "solid",
  lineColor: "#000",
  genderId: "g",
  genderName: "g",
  shape: "circle",
  fillColor: "#fff",
  textColor: "#000",
  memo: "",
  fontSize: 16,
  relationshipFontSize: 17,
  scale: 1,
  anchorNodeId: null,
  parentNodeId1: null,
  parentNodeId2: null,
  placementDirection: null,
  connectionDirection: null,
  divorced: false,
});

const node = (
  id: string,
  x: number,
  y: number,
  kind: FamilyNodeData["relationKind"],
): Node<FamilyNodeData> => ({
  id,
  position: { x, y },
  width: 180,
  height: 120,
  data: data(kind),
});

describe("node layout constraints", () => {
  it("clamps a node into every side of the frame", () => {
    expect(
      clampNodeToFrame(
        { x: -50, y: 700 },
        { width: 180, height: 120 },
        { x: 0, y: 0, width: 1000, height: 500 },
      ),
    ).toEqual({ x: 0, y: 380 });
  });

  it("shrinks and repositions an overflowing layout around self", () => {
    const frame = { x: -498, y: -228, width: 1176, height: 576 },
      result = normalizeNodesToFrame(
        [node("self", 0, 0, "self"), node("far", 1200, 500, "other")],
        frame,
      );
    expect(result).not.toBeNull();
    for (const item of result) {
      expect(item.position.x).toBeGreaterThanOrEqual(frame.x);
      expect(item.position.y).toBeGreaterThanOrEqual(frame.y);
      expect(item.position.x + (item.width || 0)).toBeLessThanOrEqual(
        frame.x + frame.width,
      );
      expect(item.position.y + (item.height || 0)).toBeLessThanOrEqual(
        frame.y + frame.height,
      );
      expect(item.data.scale).toBeGreaterThanOrEqual(0.4);
    }
  });
});
