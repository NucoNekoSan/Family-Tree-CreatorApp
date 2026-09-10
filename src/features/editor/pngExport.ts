import { getNodesBounds, getViewportForBounds, type Node } from "@xyflow/react";
import type { FamilyNodeData } from "../../familyGraph";

export const PNG_WIDTH = 2400;
export const PNG_HEIGHT = 1200;
export const PNG_EXPORT_SCALE = 2;
export const PNG_FRAME = {
  color: "#52645e",
  inset: 24,
  lineWidth: 6,
  dash: [24, 16] as const,
  radius: 28,
};

export interface PngFramePreview {
  x: number;
  y: number;
  width: number;
  height: number;
  strokeWidth: number;
  dash: readonly [number, number];
  radius: number;
}

const nodeCenter = (node: Node<FamilyNodeData>) => ({
  x:
    node.position.x +
    (node.width ||
      node.measured?.width ||
      node.initialWidth ||
      180 * node.data.scale) /
      2,
  y:
    node.position.y +
    (node.height ||
      node.measured?.height ||
      node.initialHeight ||
      120 * node.data.scale) /
      2,
});

export function getPngViewport(nodes: Node<FamilyNodeData>[]) {
  if (!nodes.length) {
    return {
      x: 0,
      y: 0,
      zoom: 1,
      style: {
        width: `${PNG_WIDTH}px`,
        height: `${PNG_HEIGHT}px`,
        transform: "translate(0px, 0px) scale(1)",
      },
    };
  }

  const self = nodes.find((node) => node.data.relationKind === "self"),
    selfCenter = self ? nodeCenter(self) : null,
    viewport = selfCenter
      ? {
          x: PNG_WIDTH / 2 - selfCenter.x * PNG_EXPORT_SCALE,
          y: PNG_HEIGHT / 2 - selfCenter.y * PNG_EXPORT_SCALE,
          zoom: PNG_EXPORT_SCALE,
        }
      : getViewportForBounds(
          getNodesBounds(nodes),
          PNG_WIDTH,
          PNG_HEIGHT,
          0.1,
          2,
          0.12,
        ),
    zoom = viewport.zoom,
    x = selfCenter ? PNG_WIDTH / 2 - selfCenter.x * zoom : viewport.x,
    y = selfCenter ? PNG_HEIGHT / 2 - selfCenter.y * zoom : viewport.y;

  return {
    x,
    y,
    zoom,
    style: {
      width: `${PNG_WIDTH}px`,
      height: `${PNG_HEIGHT}px`,
      transform: `translate(${x}px, ${y}px) scale(${zoom})`,
    },
  };
}

export function getPngFramePreview(
  nodes: Node<FamilyNodeData>[],
): PngFramePreview | null {
  if (!nodes.some((node) => node.data.relationKind === "self")) return null;

  const { x, y, zoom } = getPngViewport(nodes),
    { dash, inset, lineWidth, radius } = PNG_FRAME;

  return {
    x: (inset - x) / zoom,
    y: (inset - y) / zoom,
    width: (PNG_WIDTH - inset * 2) / zoom,
    height: (PNG_HEIGHT - inset * 2) / zoom,
    strokeWidth: lineWidth / zoom,
    dash: [dash[0] / zoom, dash[1] / zoom],
    radius: radius / zoom,
  };
}

export function drawPngFrame(context: CanvasRenderingContext2D) {
  const { color, dash, inset, lineWidth, radius } = PNG_FRAME,
    left = inset,
    top = inset,
    right = PNG_WIDTH - inset,
    bottom = PNG_HEIGHT - inset;

  context.save();
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.setLineDash([...dash]);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(left + radius, top);
  context.lineTo(right - radius, top);
  context.quadraticCurveTo(right, top, right, top + radius);
  context.lineTo(right, bottom - radius);
  context.quadraticCurveTo(right, bottom, right - radius, bottom);
  context.lineTo(left + radius, bottom);
  context.quadraticCurveTo(left, bottom, left, bottom - radius);
  context.lineTo(left, top + radius);
  context.quadraticCurveTo(left, top, left + radius, top);
  context.closePath();
  context.stroke();
  context.restore();
}
