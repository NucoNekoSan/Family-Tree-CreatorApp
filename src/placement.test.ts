import { describe, expect, it } from "vitest";
import {
  connectionHandles,
  findFreePosition,
  inferConnectionDirection,
  oppositeDirection,
  placeRelative,
} from "./placement";
describe("automatic placement", () => {
  it("places parents above the anchor", () =>
    expect(placeRelative({ x: 240, y: 180 }, "above")).toEqual({
      x: 240,
      y: 0,
    }));
  it("places children below the anchor", () =>
    expect(placeRelative({ x: 10, y: 20 }, "below")).toEqual({
      x: 10,
      y: 200,
    }));
  it("places lateral relations at a safe distance", () => {
    expect(placeRelative({ x: 300, y: 100 }, "left")).toEqual({
      x: 80,
      y: 100,
    });
    expect(placeRelative({ x: 300, y: 100 }, "right")).toEqual({
      x: 520,
      y: 100,
    });
  });
  it("moves a sibling away from an occupied position", () =>
    expect(
      findFreePosition({ x: 240, y: 180 }, "below", [{ x: 240, y: 360 }]),
    ).toEqual({ x: 460, y: 360 }));
});
describe("connection direction", () => {
  it("uses the node face nearest to the anchor", () => {
    expect(inferConnectionDirection({ x: 300, y: 0 }, { x: 0, y: 0 })).toBe(
      "left",
    );
    expect(inferConnectionDirection({ x: -300, y: 0 }, { x: 0, y: 0 })).toBe(
      "right",
    );
    expect(inferConnectionDirection({ x: 0, y: 300 }, { x: 0, y: 0 })).toBe(
      "above",
    );
    expect(inferConnectionDirection({ x: 0, y: -300 }, { x: 0, y: 0 })).toBe(
      "below",
    );
  });
  it("maps every face to its opposite", () =>
    expect(oppositeDirection).toEqual({
      above: "below",
      below: "above",
      left: "right",
      right: "left",
    }));
  it("routes both normal and reversed parent edges", () => {
    expect(connectionHandles(false, "left")).toEqual({
      sourceHandle: "source-right",
      targetHandle: "target-left",
    });
    expect(connectionHandles(true, "above")).toEqual({
      sourceHandle: "source-above",
      targetHandle: "target-below",
    });
  });
});
