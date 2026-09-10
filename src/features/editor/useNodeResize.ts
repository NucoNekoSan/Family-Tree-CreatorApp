import { useMemo } from "react";
import type { Node, ResizeParams } from "@xyflow/react";
import type { ChartNodeRecord } from "../../types";
import type { FamilyNodeData } from "../../familyGraph";
import {
  BASE_NODE_WIDTH,
  fitsFrame,
  MAX_NODE_SCALE,
  MIN_NODE_SCALE,
  nodeSize,
} from "./nodeLayout";

type PngFrame = { x: number; y: number; width: number; height: number };

export function useNodeResize(
  nodes: Node<FamilyNodeData>[],
  pngFrame: PngFrame | null,
  save: (nodeId: string, input: Partial<Omit<ChartNodeRecord, "id">>) => void,
) {
  return useMemo(
    () => ({
      canResize: (nodeId: string, params: ResizeParams) => {
        const resized = nodes.find((node) => node.id === nodeId);
        if (!pngFrame || resized?.data.relationKind !== "self")
          return fitsFrame(params, pngFrame);
        const currentSize = nodeSize(resized);
        const dx =
          params.x +
          params.width / 2 -
          (resized.position.x + currentSize.width / 2);
        const dy =
          params.y +
          params.height / 2 -
          (resized.position.y + currentSize.height / 2);
        const candidateFrame = {
          ...pngFrame,
          x: pngFrame.x + dx,
          y: pngFrame.y + dy,
        };
        return nodes.every((node) => {
          const size = node.id === nodeId ? params : nodeSize(node);
          const position = node.id === nodeId ? params : node.position;
          return fitsFrame({ ...position, ...size }, candidateFrame);
        });
      },
      saveResize: (nodeId: string, params: ResizeParams) => {
        const scale = Math.min(
          MAX_NODE_SCALE,
          Math.max(MIN_NODE_SCALE, params.width / BASE_NODE_WIDTH),
        );
        save(nodeId, { x: params.x, y: params.y, scale });
      },
    }),
    [nodes, pngFrame, save],
  );
}
