import type { Node } from "@xyflow/react";
import type { FamilyNodeData } from "../../familyGraph";

export type QuickRelation = "partner" | "child" | "parent" | "sibling";
export type AddPreset = { kind: QuickRelation; anchorId: string };
export type NodeDraft = {
  nodeId: string;
  memo: string;
  fontSize: number;
  relationshipFontSize: number;
};

export const quickRelationLabels: Record<QuickRelation, string> = {
  partner: "配偶者を追加",
  child: "子を追加",
  parent: "親を追加",
  sibling: "兄弟姉妹を追加",
};

export function findPartnerIds(
  anchorId: string | null | undefined,
  nodes: Node<FamilyNodeData>[],
) {
  const anchor = nodes.find((node) => node.id === anchorId);
  if (!anchor) return [];
  return nodes
    .filter(
      (node) =>
        (node.data.anchorNodeId === anchor.id &&
          (node.data.relationKind === "partner" ||
            node.data.relationKind === "divorce")) ||
        (anchor.data.anchorNodeId === node.id &&
          (anchor.data.relationKind === "partner" ||
            anchor.data.relationKind === "divorce")),
    )
    .map((node) => node.id);
}

export function quickDirection(
  preset: AddPreset | null | undefined,
  nodes: Node<FamilyNodeData>[],
) {
  if (!preset) return "right" as const;
  if (preset.kind === "parent") return "above" as const;
  if (preset.kind === "child") return "below" as const;
  if (preset.kind === "sibling") return "right" as const;
  return findPartnerIds(preset.anchorId, nodes).length % 2 === 0
    ? ("right" as const)
    : ("left" as const);
}
