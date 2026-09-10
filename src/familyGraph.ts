import type { CSSProperties } from "react";
import type { Edge, Node } from "@xyflow/react";
import type { Direction, LineStyle, RelationKind, Shape } from "./types";
import { connectionHandles, inferConnectionDirection } from "./placement";

export type FamilyNodeData = {
  relationshipId: string;
  relationshipName: string;
  relationKind: RelationKind;
  lineStyle: LineStyle;
  lineColor: string;
  genderId: string;
  genderName: string;
  shape: Shape;
  fillColor: string;
  textColor: string;
  memo: string;
  fontSize: number;
  relationshipFontSize: number;
  scale: number;
  anchorNodeId: string | null;
  parentNodeId1: string | null;
  parentNodeId2: string | null;
  placementDirection: Direction | null;
  connectionDirection: Direction | null;
  divorced: boolean;
};
export type FamilyTreeEdgeData = {
  branchY: number;
  sharedStyle: CSSProperties;
  singleParent: boolean;
  divorced: boolean;
  children: { id: string; x: number; y: number; style: CSSProperties }[];
};

const fallbackStyle = { stroke: "#52645e", strokeWidth: 2 };
const size = (node: Node<FamilyNodeData>) => ({
  width: node.measured?.width || node.width || 180 * node.data.scale,
  height: node.measured?.height || node.height || 120 * node.data.scale,
});
const center = (node: Node<FamilyNodeData>) => {
  const dimensions = size(node);
  return {
    x: node.position.x + dimensions.width / 2,
    y: node.position.y + dimensions.height / 2,
  };
};
const lineStyle = (node?: Node<FamilyNodeData>): CSSProperties =>
  node
    ? {
        stroke: node.data.lineColor || fallbackStyle.stroke,
        strokeWidth: 2,
        strokeDasharray:
          node.data.lineStyle === "dashed"
            ? "9 6"
            : node.data.lineStyle === "dotted"
              ? "2 6"
              : undefined,
      }
    : fallbackStyle;

function routeFamilyEdges(nodes: Node<FamilyNodeData>[], edges: Edge[]) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return edges.map((edge) => {
    const source = byId.get(edge.source),
      target = byId.get(edge.target);
    if (!source || !target) return edge;
    const candidates = [
      [source, target],
      [target, source],
    ] as const;
    const pair =
      candidates.find(
        ([node, anchor]) =>
          node.data.anchorNodeId === anchor.id &&
          node.data.relationshipId === edge.data?.relationshipId,
      ) ||
      candidates.find(([node, anchor]) => node.data.anchorNodeId === anchor.id);
    if (!pair) return edge;
    const [node, anchor] = pair,
      direction =
        node.data.connectionDirection ||
        inferConnectionDirection(node.position, anchor.position);
    return { ...edge, ...connectionHandles(node.id === source.id, direction) };
  });
}

export function buildFamilyGraph(nodes: Node<FamilyNodeData>[], edges: Edge[]) {
  const byId = new Map(nodes.map((node) => [node.id, node])),
    routedEdges = routeFamilyEdges(nodes, edges),
    groups = new Map<
      string,
      {
        parent1Id: string;
        parent2Id: string | null;
        children: Node<FamilyNodeData>[];
      }
    >();
  for (const child of nodes) {
    const { parentNodeId1, parentNodeId2 } = child.data;
    if (!parentNodeId1) continue;
    const key = parentNodeId2
      ? [parentNodeId1, parentNodeId2].sort().join(":")
      : `single:${parentNodeId1}`;
    const group = groups.get(key);
    if (group) group.children.push(child);
    else
      groups.set(key, {
        parent1Id: parentNodeId1,
        parent2Id: parentNodeId2,
        children: [child],
      });
  }
  const parentsByAnchor = new Map<string, Node<FamilyNodeData>[]>();
  for (const parent of nodes) {
    const anchorId = parent.data.anchorNodeId;
    if (!anchorId || parent.data.relationKind !== "parent") continue;
    const parents = parentsByAnchor.get(anchorId);
    if (parents) parents.push(parent);
    else parentsByAnchor.set(anchorId, [parent]);
  }
  for (const [anchorId, parents] of parentsByAnchor) {
    if (parents.length < 2) continue;
    const [parent1, parent2] = parents,
      key = [parent1.id, parent2.id].sort().join(":");
    if (groups.has(key)) continue;
    const anchor = byId.get(anchorId);
    if (anchor)
      groups.set(key, {
        parent1Id: parent1.id,
        parent2Id: parent2.id,
        children: [anchor],
      });
  }
  const treeEdges: Edge<FamilyTreeEdgeData>[] = [],
    suppressedPairs = new Set<string>(),
    pairKey = (a: string, b: string) => [a, b].sort().join(":");
  for (const [key, group] of groups) {
    const { parent1Id, parent2Id } = group,
      parent1 = byId.get(parent1Id),
      parent2 = parent2Id ? byId.get(parent2Id) : undefined;
    if (!parent1 || (parent2Id && !parent2)) continue;
    if (!parent2) {
      const children = group.children,
        branchY = Math.min(...children.map((child) => child.position.y)) - 55;
      for (const child of children) {
        suppressedPairs.add(pairKey(parent1Id, child.id));
        if (child.data.anchorNodeId)
          suppressedPairs.add(pairKey(child.id, child.data.anchorNodeId));
      }
      treeEdges.push({
        id: `family-tree:${key}`,
        source: parent1.id,
        sourceHandle: "source-below",
        target: children[0].id,
        targetHandle: "target-above",
        type: "familyTree",
        data: {
          branchY,
          sharedStyle: lineStyle(parent1),
          singleParent: true,
          divorced: false,
          children: children.map((child) => ({
            id: child.id,
            x: center(child).x,
            y: child.position.y,
            style: lineStyle(child),
          })),
        },
      });
      continue;
    }
    const sharedAnchorId =
        parent1.data.anchorNodeId &&
        parent1.data.anchorNodeId === parent2.data.anchorNodeId
          ? parent1.data.anchorNodeId
          : null,
      sharedAnchor = sharedAnchorId ? byId.get(sharedAnchorId) : undefined;
    if (
      sharedAnchor &&
      !group.children.some((child) => child.id === sharedAnchor.id)
    )
      group.children.push(sharedAnchor);
    const children = group.children,
      partnerEdge = routedEdges.find(
        (edge) =>
          pairKey(edge.source, edge.target) === pairKey(parent1Id, parent2.id),
      );
    suppressedPairs.add(pairKey(parent1Id, parent2.id));
    for (const child of children) {
      suppressedPairs.add(pairKey(parent1Id, child.id));
      suppressedPairs.add(pairKey(parent2.id, child.id));
      if (child.data.anchorNodeId)
        suppressedPairs.add(pairKey(child.id, child.data.anchorNodeId));
    }
    const parent1Center = center(parent1),
      parent2Center = center(parent2),
      left = parent1Center.x <= parent2Center.x ? parent1 : parent2,
      right = left === parent1 ? parent2 : parent1,
      branchY = Math.min(...children.map((child) => child.position.y)) - 55;
    treeEdges.push({
      id: `family-tree:${key}`,
      source: left.id,
      sourceHandle: "source-right",
      target: right.id,
      targetHandle: "target-left",
      type: "familyTree",
      data: {
        branchY,
        sharedStyle: partnerEdge?.style || lineStyle(parent1),
        singleParent: false,
        divorced: partnerEdge?.data?.relationKind === "divorce",
        children: children.map((child) => ({
          id: child.id,
          x: center(child).x,
          y: child.position.y,
          style: lineStyle(child),
        })),
      },
    });
  }
  const visibleEdges = routedEdges.filter(
    (edge) => !suppressedPairs.has(pairKey(edge.source, edge.target)),
  );
  return { nodes, edges: [...visibleEdges, ...treeEdges] };
}
