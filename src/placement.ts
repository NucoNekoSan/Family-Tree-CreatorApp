import type { Direction } from "./types";
export const placementOffset: Record<Direction, { x: number; y: number }> = {
  above: { x: 0, y: -180 },
  below: { x: 0, y: 180 },
  left: { x: -220, y: 0 },
  right: { x: 220, y: 0 },
};
export const oppositeDirection: Record<Direction, Direction> = {
  above: "below",
  below: "above",
  left: "right",
  right: "left",
};
export function placeRelative(
  base: { x: number; y: number },
  direction: Direction,
) {
  const d = placementOffset[direction];
  return { x: base.x + d.x, y: base.y + d.y };
}
export function findFreePosition(
  base: { x: number; y: number },
  direction: Direction,
  occupied: { x: number; y: number }[],
) {
  const position = placeRelative(base, direction);
  const horizontal = direction === "above" || direction === "below";
  while (
    occupied.some(
      (p) =>
        Math.abs(p.x - position.x) < 120 && Math.abs(p.y - position.y) < 100,
    )
  ) {
    if (horizontal) position.x += 220;
    else position.y += 180;
  }
  return position;
}
export function inferConnectionDirection(
  node: { x: number; y: number },
  anchor: { x: number; y: number },
): Direction {
  const dx = node.x - anchor.x,
    dy = node.y - anchor.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "left" : "right";
  return dy >= 0 ? "above" : "below";
}
export function connectionHandles(
  ownerIsSource: boolean,
  direction: Direction,
) {
  const other = oppositeDirection[direction];
  return ownerIsSource
    ? { sourceHandle: `source-${direction}`, targetHandle: `target-${other}` }
    : { sourceHandle: `source-${other}`, targetHandle: `target-${direction}` };
}
