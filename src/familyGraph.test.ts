import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import {
  buildFamilyGraph,
  type FamilyNodeData,
  type FamilyTreeEdgeData,
} from "./familyGraph";

const data = (
  name: string,
  overrides: Partial<FamilyNodeData> = {},
): FamilyNodeData => ({
  relationshipId: name,
  relationshipName: name,
  relationKind: "other",
  lineStyle: "solid",
  lineColor: "#52645e",
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
  ...overrides,
});
const node = (
  id: string,
  x: number,
  y: number,
  overrides: Partial<FamilyNodeData> = {},
): Node<FamilyNodeData> => ({
  id,
  type: "family",
  position: { x, y },
  measured: { width: 180, height: 90 },
  data: data(id, overrides),
});

describe("family tree graph", () => {
  it("creates a parent union as soon as two parents share an anchor", () => {
    const nodes = [
        node("father", 100, 100, {
          anchorNodeId: "self",
          relationKind: "parent",
        }),
        node("mother", 500, 100, {
          anchorNodeId: "self",
          relationKind: "parent",
        }),
        node("self", 300, 400),
      ],
      edges: Edge[] = [
        { id: "father-edge", source: "self", target: "father" },
        { id: "mother-edge", source: "self", target: "mother" },
      ],
      graph = buildFamilyGraph(nodes, edges),
      tree = graph.edges[0] as Edge<FamilyTreeEdgeData>;
    expect(graph.edges).toHaveLength(1);
    expect(tree).toMatchObject({
      source: "father",
      target: "mother",
      type: "familyTree",
    });
    expect(tree.data).toMatchObject({
      branchY: 345,
      children: [{ id: "self", x: 390, y: 400 }],
    });
  });

  it("creates one real parent edge with branches for every child, including their shared anchor", () => {
    const nodes = [
        node("father", 100, 100, {
          anchorNodeId: "self",
          lineColor: "#123456",
          lineStyle: "dashed",
        }),
        node("mother", 500, 140, { anchorNodeId: "self" }),
        node("brother", 0, 400, {
          anchorNodeId: "self",
          parentNodeId1: "father",
          parentNodeId2: "mother",
          lineColor: "#111111",
        }),
        node("self", 300, 420, { lineColor: "#222222" }),
        node("sister", 650, 390, {
          anchorNodeId: "self",
          parentNodeId1: "mother",
          parentNodeId2: "father",
          lineColor: "#333333",
        }),
      ],
      edges: Edge[] = [
        { id: "father-edge", source: "self", target: "father" },
        { id: "mother-edge", source: "self", target: "mother" },
        { id: "brother-edge", source: "self", target: "brother" },
        { id: "sister-edge", source: "self", target: "sister" },
      ],
      graph = buildFamilyGraph(nodes, edges),
      tree = graph.edges.find(
        (edge) => edge.type === "familyTree",
      ) as Edge<FamilyTreeEdgeData>;
    expect(tree).toMatchObject({
      source: "father",
      sourceHandle: "source-right",
      target: "mother",
      targetHandle: "target-left",
      type: "familyTree",
    });
    expect(tree.data?.sharedStyle).toMatchObject({
      stroke: "#123456",
      strokeDasharray: "9 6",
    });
    expect(tree.data?.children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "brother",
          x: 90,
          y: 400,
          style: expect.objectContaining({ stroke: "#111111" }),
        }),
        expect.objectContaining({
          id: "self",
          x: 390,
          y: 420,
          style: expect.objectContaining({ stroke: "#222222" }),
        }),
        expect.objectContaining({
          id: "sister",
          x: 740,
          y: 390,
          style: expect.objectContaining({ stroke: "#333333" }),
        }),
      ]),
    );
    expect(graph.edges.map((edge) => edge.id)).toEqual([
      "family-tree:father:mother",
    ]);
    expect(graph.nodes).toEqual(nodes);
  });
  it("supports one child and recalculates coordinates after dragging", () => {
    const nodes = [
        node("p1", 20, 20),
        node("p2", 420, 120),
        node("child", 250, 400, { parentNodeId1: "p1", parentNodeId2: "p2" }),
      ],
      tree = buildFamilyGraph(nodes, []).edges[0] as Edge<FamilyTreeEdgeData>;
    expect(tree.data).toMatchObject({
      branchY: 345,
      children: [{ id: "child", x: 340, y: 400 }],
    });
    nodes[2].position = { x: 500, y: 500 };
    const moved = buildFamilyGraph(nodes, [])
      .edges[0] as Edge<FamilyTreeEdgeData>;
    expect(moved.data).toMatchObject({
      branchY: 445,
      children: [{ id: "child", x: 590, y: 500 }],
    });
  });

  it("groups children connected to a single parent", () => {
    const nodes = [
        node("parent", 300, 100),
        node("child-1", 180, 400, {
          anchorNodeId: "parent",
          parentNodeId1: "parent",
        }),
        node("child-2", 430, 400, {
          anchorNodeId: "parent",
          parentNodeId1: "parent",
        }),
      ],
      edges: Edge[] = [
        { id: "child-1-edge", source: "parent", target: "child-1" },
        { id: "child-2-edge", source: "parent", target: "child-2" },
      ],
      graph = buildFamilyGraph(nodes, edges),
      tree = graph.edges[0] as Edge<FamilyTreeEdgeData>;
    expect(graph.edges).toHaveLength(1);
    expect(tree).toMatchObject({
      source: "parent",
      target: "child-1",
      sourceHandle: "source-below",
      type: "familyTree",
      data: {
        singleParent: true,
        children: [{ id: "child-1" }, { id: "child-2" }],
      },
    });
  });

  it("keeps separate child branches for multiple partners", () => {
    const nodes = [
        node("person", 300, 100),
        node("partner-1", 50, 100, { anchorNodeId: "person" }),
        node("partner-2", 550, 100, { anchorNodeId: "person" }),
        node("child-1", 150, 400, {
          parentNodeId1: "person",
          parentNodeId2: "partner-1",
        }),
        node("child-2", 500, 400, {
          parentNodeId1: "person",
          parentNodeId2: "partner-2",
        }),
      ],
      graph = buildFamilyGraph(nodes, []);
    expect(graph.edges).toHaveLength(2);
    expect(
      graph.edges
        .map((edge) => (edge as Edge<FamilyTreeEdgeData>).data?.children[0].id)
        .sort(),
    ).toEqual(["child-1", "child-2"]);
  });

  it("suppresses a duplicate partner edge and moves divorce state to the union", () => {
    const nodes = [
        node("parent-1", 100, 100),
        node("parent-2", 500, 100),
        node("child", 300, 400, {
          parentNodeId1: "parent-1",
          parentNodeId2: "parent-2",
        }),
      ],
      edges: Edge[] = [
        {
          id: "partner-edge",
          source: "parent-1",
          target: "parent-2",
          data: { relationKind: "divorce" },
        },
      ],
      graph = buildFamilyGraph(nodes, edges),
      tree = graph.edges[0] as Edge<FamilyTreeEdgeData>;
    expect(graph.edges).toHaveLength(1);
    expect(tree.data).toMatchObject({ singleParent: false, divorced: true });
  });
});
