import type { Node } from "@xyflow/react";
import type { FamilyNodeData } from "../../familyGraph";
import type { ChartNodeLayout } from "../../types";

export const BASE_NODE_WIDTH = 180;
export const BASE_NODE_HEIGHT = 120;
export const MIN_NODE_SCALE = 0.4;
export const MAX_NODE_SCALE = 2;
export const MAX_NODE_HEIGHT = 576;

export type LayoutFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const nodeSize = (node: Node<FamilyNodeData>) => ({
  width:
    node.width || node.measured?.width || BASE_NODE_WIDTH * node.data.scale,
  height:
    node.height || node.measured?.height || BASE_NODE_HEIGHT * node.data.scale,
});

export function clampNodeToFrame(
  position: { x: number; y: number },
  size: { width: number; height: number },
  frame: LayoutFrame | null,
) {
  if (!frame) return position;
  return {
    x: Math.min(
      Math.max(position.x, frame.x),
      frame.x + frame.width - size.width,
    ),
    y: Math.min(
      Math.max(position.y, frame.y),
      frame.y + frame.height - size.height,
    ),
  };
}

export function fitsFrame(
  bounds: { x: number; y: number; width: number; height: number },
  frame: LayoutFrame | null,
) {
  return (
    !frame ||
    (bounds.x >= frame.x &&
      bounds.y >= frame.y &&
      bounds.x + bounds.width <= frame.x + frame.width &&
      bounds.y + bounds.height <= frame.y + frame.height)
  );
}

export function normalizeNodesToFrame(
  nodes: Node<FamilyNodeData>[],
  frame: LayoutFrame | null,
) {
  const self = nodes.find((node) => node.data.relationKind === "self");
  if (!self || !frame || !nodes.length) return nodes;
  const selfSize = nodeSize(self),
    center = {
      x: self.position.x + selfSize.width / 2,
      y: self.position.y + selfSize.height / 2,
    },
    maxX = Math.max(
      ...nodes.flatMap((node) => {
        const size = nodeSize(node);
        return [
          Math.abs(node.position.x - center.x),
          Math.abs(node.position.x + size.width - center.x),
        ];
      }),
    ),
    maxY = Math.max(
      ...nodes.flatMap((node) => {
        const size = nodeSize(node);
        return [
          Math.abs(node.position.y - center.y),
          Math.abs(node.position.y + size.height - center.y),
        ];
      }),
    ),
    factor = Math.min(1, frame.width / 2 / maxX, frame.height / 2 / maxY);
  if (factor >= 0.999999) return nodes;

  return nodes.map((node) => {
    const oldSize = nodeSize(node),
      oldCenter = {
        x: node.position.x + oldSize.width / 2,
        y: node.position.y + oldSize.height / 2,
      },
      scale = Math.max(MIN_NODE_SCALE, node.data.scale * factor),
      size = {
        width: BASE_NODE_WIDTH * scale,
        height: BASE_NODE_HEIGHT * scale,
      },
      position = clampNodeToFrame(
        {
          x: center.x + (oldCenter.x - center.x) * factor - size.width / 2,
          y: center.y + (oldCenter.y - center.y) * factor - size.height / 2,
        },
        size,
        frame,
      );
    return {
      ...node,
      position,
      width: size.width,
      height: size.height,
      data: { ...node.data, scale },
    };
  });
}

export const toNodeLayout = (
  nodes: Node<FamilyNodeData>[],
): ChartNodeLayout[] =>
  nodes.map((node) => ({
    id: node.id,
    x: node.position.x,
    y: node.position.y,
    scale: node.data.scale,
  }));
