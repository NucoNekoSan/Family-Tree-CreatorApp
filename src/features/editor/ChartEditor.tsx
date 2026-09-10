import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Background,
  Controls,
  type Edge,
  MiniMap,
  type Node,
  ReactFlow,
  type ReactFlowInstance,
  useEdgesState,
  useNodesState,
  ViewportPortal,
} from "@xyflow/react";
import {
  ArrowLeft,
  Baby,
  Check,
  Download,
  Plus,
  Save,
  Settings as SettingsIcon,
  Trash2,
  UserRoundPlus,
  Users,
} from "lucide-react";
import { api } from "../../api";
import type { ChartDetail, ChartNodeRecord, Direction } from "../../types";
import { findFreePosition } from "../../placement";
import { type FamilyNodeData } from "../../familyGraph";

import { Logo, Notice, Shell, Spinner } from "../../components/ui";
import { directionLabels, getErrorMessage } from "../../domain";
import { hydrateChart } from "./hydrateChart";
import {
  findPartnerIds,
  quickDirection,
  quickRelationLabels,
  type AddPreset,
  type NodeDraft,
  type QuickRelation,
} from "./editorPresets";
import { useEditorPreview } from "./useEditorPreview";
import { FamilyEdge } from "./FamilyEdge";
import { FamilyTreeEdge } from "./FamilyTreeEdge";
import { useNodeResize } from "./useNodeResize";
import { useChartTitleSave } from "./useChartTitleSave";
import { useChartNodeMutations } from "./useChartNodeMutations";
import { NodeTextFields } from "./NodeTextFields";
import { FamilyNode } from "./FamilyNode";
import { ResizeContext } from "./resizeContext";
import {
  drawPngFrame,
  getPngFramePreview,
  getPngViewport,
  PNG_FRAME,
  PNG_HEIGHT,
  PNG_WIDTH,
} from "./pngExport";
import {
  BASE_NODE_HEIGHT,
  BASE_NODE_WIDTH,
  clampNodeToFrame,
  nodeSize,
  normalizeNodesToFrame,
} from "./nodeLayout";

const nodeTypes = { family: FamilyNode },
  edgeTypes = { family: FamilyEdge, familyTree: FamilyTreeEdge };
function ChartEditor() {
  const { id = "" } = useParams(),
    nav = useNavigate(),
    qc = useQueryClient(),
    flowRef = useRef<HTMLDivElement>(null),
    flow = useRef<ReactFlowInstance<Node<FamilyNodeData>, Edge> | null>(null),
    chart = useQuery({ queryKey: ["chart", id], queryFn: () => api.chart(id) }),
    [nodes, setNodes, onNodesChange] = useNodesState<Node<FamilyNodeData>>([]),
    [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]),
    [selected, setSelected] = useState<string | null>(null),
    [panel, setPanel] = useState<"add" | "edit">("add"),
    [addPreset, setAddPreset] = useState<AddPreset | null>(null),
    [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved"),
    [isExporting, setIsExporting] = useState(false),
    [exportError, setExportError] = useState(""),
    [nodeDraft, setNodeDraft] = useState<NodeDraft | null>(null),
    [connectionPreview, setConnectionPreview] = useState<{
      nodeId: string;
      direction: Direction | null;
    } | null>(null),
    normalizedChart = useRef(""),
    dragStart = useRef<{
      self: { x: number; y: number };
      nodes: Node<FamilyNodeData>[];
    } | null>(null);
  useEffect(() => {
    if (chart.data) {
      const h = hydrateChart(chart.data);
      setNodes(h.nodes);
      setEdges(h.edges);
    }
  }, [chart.data, setNodes, setEdges]);
  const refresh = (d: ChartDetail) => {
    qc.setQueryData(["chart", id], d);
    const h = hydrateChart(d);
    setNodes(h.nodes);
    setEdges(h.edges);
    setConnectionPreview(null);
    setNodeDraft(null);
    setSaveState("saved");
  };
  const { create, update, layout, remove } = useChartNodeMutations(
    id,
    refresh,
    setSaveState,
    () => {
      setSelected(null);
      setPanel("add");
    },
  );
  const titleSave = useChartTitleSave(id);
  const { display, pngFrame } = useEditorPreview(
      nodes,
      edges,
      connectionPreview,
      nodeDraft,
    ),
    resizeActions = useNodeResize(nodes, pngFrame, (nodeId, input) =>
      update.mutate({ nodeId, input }),
    );
  useEffect(() => {
    if (!chart.data || normalizedChart.current === id || !nodes.length) return;
    if (nodes.some((node) => !node.measured?.height)) return;
    normalizedChart.current = id;
    const frame = getPngFramePreview(nodes),
      normalized = normalizeNodesToFrame(nodes, frame);
    if (normalized !== nodes) {
      setNodes(normalized);
      layout.mutate(normalized);
    }
  }, [chart.data, id, layout, nodes, setNodes]);
  const previewNodeDraft = useCallback((draft: NodeDraft | null) => {
    setNodeDraft(draft);
  }, []);
  const exportPng = async () => {
    if (!flowRef.current) return;
    setIsExporting(true);
    setExportError("");
    const viewport = flowRef.current.querySelector<HTMLElement>(
      ".react-flow__viewport",
    );
    try {
      if (!viewport) throw new Error("React Flow viewport was not found");
      const { toCanvas } = await import("html-to-image"),
        exportViewport = getPngViewport(display.nodes),
        canvas = await toCanvas(viewport, {
          width: PNG_WIDTH,
          height: PNG_HEIGHT,
          pixelRatio: 1,
          style: exportViewport.style,
          filter: (node) =>
            !(node instanceof Element) ||
            (!node.closest(".png-frame-preview") &&
              !node.classList.contains("react-flow__controls") &&
              !node.classList.contains("react-flow__minimap") &&
              !node.classList.contains("react-flow__background")),
        }),
        context = canvas.getContext("2d"),
        link = document.createElement("a"),
        stamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, "-");
      if (!context) throw new Error("PNG canvas context was not found");
      drawPngFrame(context);
      link.download = `${chart.data?.title || "相関図"}-${stamp}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      setExportError("PNGの保存に失敗しました。再度お試しください。");
    } finally {
      setIsExporting(false);
    }
  };
  if (chart.isLoading) return <Spinner />;
  if (chart.isError || !chart.data)
    return (
      <Shell>
        <main className="page">
          <Notice tone="error">{getErrorMessage(chart.error)}</Notice>
        </main>
      </Shell>
    );
  const selectedNode = nodes.find((n) => n.id === selected) || null;
  return (
    <div className="editor-shell">
      <header className="editor-topbar">
        <button
          className="icon"
          onClick={() => nav("/charts")}
          aria-label="一覧へ戻る"
        >
          <ArrowLeft />
        </button>
        <Logo />
        <span className="top-divider" />
        <input
          className="title-input"
          aria-label="相関図タイトル"
          defaultValue={chart.data.title}
          onBlur={(e) =>
            e.target.value.trim() &&
            e.target.value !== chart.data?.title &&
            titleSave.mutate(e.target.value.trim())
          }
        />
        <div className={`save-state ${saveState}`}>
          <Save size={14} />
          {saveState === "saving"
            ? "保存中"
            : saveState === "error"
              ? "保存失敗"
              : "保存済み"}
        </div>
        <button className="button" onClick={() => nav("/settings")}>
          <SettingsIcon size={17} />
          表示設定
        </button>
        <button
          className="button primary"
          onClick={exportPng}
          disabled={isExporting}
        >
          <Download size={17} />
          {isExporting ? "PNG作成中…" : "PNG保存"}
        </button>
      </header>
      <main className="editor-body">
        <aside className="editor-panel">
          <div className="panel-tabs">
            <button
              className={panel === "add" ? "active" : ""}
              onClick={() => {
                setPanel("add");
                setAddPreset(null);
                setConnectionPreview(null);
                setNodeDraft(null);
              }}
            >
              <Plus size={17} />
              追加
            </button>
            <button
              className={panel === "edit" ? "active" : ""}
              disabled={!selectedNode}
              onClick={() => setPanel("edit")}
            >
              <SettingsIcon size={17} />
              編集
            </button>
          </div>
          {panel === "add" ? (
            <NodeForm
              key={
                addPreset ? `${addPreset.kind}:${addPreset.anchorId}` : "root"
              }
              mode="add"
              detail={chart.data}
              nodes={nodes}
              preset={addPreset}
              onSubmit={(v) => {
                const position = clampNodeToFrame(
                  { x: v.x, y: v.y },
                  {
                    width: BASE_NODE_WIDTH * v.scale,
                    height: BASE_NODE_HEIGHT * v.scale,
                  },
                  pngFrame,
                );
                create.mutate({ ...v, ...position });
              }}
            />
          ) : (
            selectedNode && (
              <>
                <QuickAddActions
                  node={selectedNode}
                  onSelect={(kind) => {
                    setAddPreset({ kind, anchorId: selectedNode.id });
                    setPanel("add");
                  }}
                />
                <NodeForm
                  mode="edit"
                  detail={chart.data}
                  nodes={nodes}
                  value={selectedNode}
                  onConnectionPreview={(direction) =>
                    setConnectionPreview({ nodeId: selectedNode.id, direction })
                  }
                  onDraftChange={previewNodeDraft}
                  onSubmit={(v) =>
                    update.mutate({ nodeId: selectedNode.id, input: v })
                  }
                  onDelete={() =>
                    confirm("このノードと接続線を削除しますか？") &&
                    remove.mutate(selectedNode.id)
                  }
                />
              </>
            )
          )}{" "}
          {(create.error || update.error) && (
            <Notice tone="error">
              {getErrorMessage(create.error || update.error)}
            </Notice>
          )}
          {exportError && <Notice tone="error">{exportError}</Notice>}
          <footer>
            <p>
              <b>{nodes.length}</b> ノード
            </p>
            <p>ドラッグして自由に配置</p>
          </footer>
        </aside>
        <section className="flow-wrap" ref={flowRef}>
          <ResizeContext.Provider value={resizeActions}>
            <ReactFlow
              nodes={display.nodes}
              edges={display.edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodesChange={(changes) =>
                onNodesChange(
                  changes.filter(
                    (c) =>
                      !("id" in c) ||
                      (!c.id.startsWith("union:") && !c.id.startsWith("hub:")),
                  ),
                )
              }
              onEdgesChange={onEdgesChange}
              onInit={(v) => {
                flow.current = v as ReactFlowInstance<
                  Node<FamilyNodeData>,
                  Edge
                >;
                setTimeout(() => v.fitView({ padding: 0.2 }), 60);
              }}
              onNodeClick={(_, n) => {
                if (n.type !== "family") return;
                setConnectionPreview(null);
                setSelected(n.id);
                setAddPreset(null);
                setPanel("edit");
              }}
              onPaneClick={() => {
                setConnectionPreview(null);
                setNodeDraft(null);
                setSelected(null);
              }}
              onNodeDragStart={(_, n) => {
                if (n.data.relationKind === "self")
                  dragStart.current = {
                    self: { ...n.position },
                    nodes: nodes.map((node) => ({
                      ...node,
                      position: { ...node.position },
                    })),
                  };
              }}
              onNodeDrag={(_, n) => {
                if (n.data.relationKind === "self" && dragStart.current) {
                  const dx = n.position.x - dragStart.current.self.x,
                    dy = n.position.y - dragStart.current.self.y;
                  setNodes(
                    dragStart.current.nodes.map((node) => ({
                      ...node,
                      position: {
                        x: node.position.x + dx,
                        y: node.position.y + dy,
                      },
                    })),
                  );
                } else if (n.type === "family") {
                  const position = clampNodeToFrame(
                    n.position,
                    nodeSize(n),
                    pngFrame,
                  );
                  if (
                    position.x !== n.position.x ||
                    position.y !== n.position.y
                  )
                    setNodes((current) =>
                      current.map((node) =>
                        node.id === n.id ? { ...node, position } : node,
                      ),
                    );
                }
              }}
              onNodeDragStop={(_, n) => {
                if (n.type !== "family") return;
                if (n.data.relationKind === "self") {
                  const start = dragStart.current,
                    dx = start ? n.position.x - start.self.x : 0,
                    dy = start ? n.position.y - start.self.y : 0,
                    moved = start
                      ? start.nodes.map((node) => ({
                          ...node,
                          position: {
                            x: node.position.x + dx,
                            y: node.position.y + dy,
                          },
                        }))
                      : nodes;
                  dragStart.current = null;
                  setNodes(moved);
                  layout.mutate(moved);
                } else {
                  const position = clampNodeToFrame(
                    n.position,
                    nodeSize(n),
                    pngFrame,
                  );
                  update.mutate({ nodeId: n.id, input: position });
                }
              }}
              minZoom={0.3}
              maxZoom={2}
              fitView
            >
              <Background color="#c7cdc8" gap={24} size={1} />
              {pngFrame && (
                <ViewportPortal>
                  <svg
                    className="png-frame-preview"
                    aria-hidden="true"
                    width={pngFrame.width}
                    height={pngFrame.height}
                    style={{
                      transform: `translate(${pngFrame.x}px, ${pngFrame.y}px)`,
                    }}
                  >
                    <rect
                      width={pngFrame.width}
                      height={pngFrame.height}
                      rx={pngFrame.radius}
                      fill="none"
                      stroke={PNG_FRAME.color}
                      strokeWidth={pngFrame.strokeWidth}
                      strokeDasharray={pngFrame.dash.join(" ")}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </ViewportPortal>
              )}
              <MiniMap
                nodeColor={(n) =>
                  (n.data as Partial<FamilyNodeData>).fillColor || "#52645e"
                }
                maskColor="rgba(244,242,235,.72)"
              />
              <Controls position="bottom-right" />
            </ReactFlow>
          </ResizeContext.Provider>
          {!nodes.length && (
            <div className="flow-empty">
              <div>
                <Users />
              </div>
              <h2>最初のノードを追加</h2>
              <p>左側で続柄と性別を選ぶと、ここに相関図が始まります。</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function QuickAddActions({
  node,
  onSelect,
}: {
  node: Node<FamilyNodeData>;
  onSelect(kind: QuickRelation): void;
}) {
  return (
    <section className="quick-add" aria-labelledby="quick-add-title">
      <h2 id="quick-add-title">この人物の家族を追加</h2>
      <p>{node.data.relationshipName}との関係を選ぶと接続を自動設定します。</p>
      <div className="quick-add-grid">
        <button type="button" onClick={() => onSelect("partner")}>
          <UserRoundPlus aria-hidden="true" /> 配偶者
        </button>
        <button type="button" onClick={() => onSelect("child")}>
          <Baby aria-hidden="true" /> 子
        </button>
        <button type="button" onClick={() => onSelect("parent")}>
          <UserRoundPlus aria-hidden="true" /> 親
        </button>
        <button type="button" onClick={() => onSelect("sibling")}>
          <Users aria-hidden="true" /> 兄弟姉妹
        </button>
      </div>
    </section>
  );
}

export function NodeForm({
  mode,
  detail,
  nodes,
  value,
  preset,
  onSubmit,
  onDelete,
  onConnectionPreview,
  onDraftChange,
}: {
  mode: "add" | "edit";
  detail: ChartDetail;
  nodes: Node<FamilyNodeData>[];
  value?: Node<FamilyNodeData> | null;
  preset?: AddPreset | null;
  onSubmit(v: Omit<ChartNodeRecord, "id">): void;
  onDelete?(): void;
  onConnectionPreview?(direction: Direction | null): void;
  onDraftChange?(draft: NodeDraft | null): void;
}) {
  const presetKinds =
      preset?.kind === "partner"
        ? ["partner", "divorce"]
        : preset
          ? [preset.kind]
          : null,
    activeR = detail.relationships.filter(
      (v) =>
        (v.active || v.id === value?.data.relationshipId) &&
        (!presetKinds || presetKinds.includes(v.kind)),
    ),
    activeG = detail.genders.filter(
      (v) => v.active || v.id === value?.data.genderId,
    ),
    presetAnchor = nodes.find((node) => node.id === preset?.anchorId),
    partnerIds = findPartnerIds(preset?.anchorId, nodes),
    record = value ? detail.nodes.find((n) => n.id === value.id) : undefined,
    [relationshipId, setRelationship] = useState(
      value?.data.relationshipId || activeR[0]?.id || "",
    ),
    [genderId, setGender] = useState(
      value?.data.genderId || activeG[0]?.id || "",
    ),
    [anchorNodeId, setAnchor] = useState<string | null>(
      record?.anchorNodeId || preset?.anchorId || nodes[0]?.id || null,
    ),
    [parentNodeId1, setParent1] = useState<string | null>(
      record?.parentNodeId1 ||
        (preset?.kind === "child" ? preset.anchorId : null) ||
        (preset?.kind === "sibling"
          ? nodes.find((node) => node.id === preset.anchorId)?.data
              .parentNodeId1 || null
          : null),
    ),
    [parentNodeId2, setParent2] = useState<string | null>(
      record?.parentNodeId2 ||
        (preset?.kind === "child" && partnerIds.length === 1
          ? partnerIds[0]
          : preset?.kind === "sibling"
            ? nodes.find((node) => node.id === preset.anchorId)?.data
                .parentNodeId2 || null
            : null),
    ),
    [placementDirection, setDirection] = useState<Direction>(
      record?.placementDirection || quickDirection(preset, nodes),
    ),
    [connectionDirection, setConnectionDirection] = useState<Direction | null>(
      record?.connectionDirection || null,
    ),
    [divorced, setDivorced] = useState(record?.divorced || false),
    [memo, setMemo] = useState(value?.data.memo || ""),
    [fontSize, setFontSize] = useState(value?.data.fontSize || 16),
    [relationshipFontSize, setRelationshipFontSize] = useState(
      value?.data.relationshipFontSize || 17,
    );
  useEffect(() => {
    if (value) {
      const r = detail.nodes.find((n) => n.id === value.id);
      setRelationship(value.data.relationshipId);
      setGender(value.data.genderId);
      setMemo(value.data.memo);
      setFontSize(value.data.fontSize);
      setRelationshipFontSize(value.data.relationshipFontSize);
      setAnchor(r?.anchorNodeId || null);
      setParent1(r?.parentNodeId1 || null);
      setParent2(r?.parentNodeId2 || null);
      setDirection(r?.placementDirection || "right");
      setConnectionDirection(r?.connectionDirection || null);
      setDivorced(r?.divorced || false);
    }
  }, [value, detail.nodes, detail.relationships]);
  const draftNodeId = value?.id;
  useEffect(
    () => () => {
      if (mode === "edit" && draftNodeId) onDraftChange?.(null);
    },
    [draftNodeId, mode, onDraftChange],
  );
  const options = nodes.filter((n) => n.id !== value?.id),
    pairValid = !parentNodeId2 || parentNodeId1 !== parentNodeId2,
    hasParentPair = !!(parentNodeId1 && parentNodeId2),
    selectedRelation = detail.relationships.find(
      (r) => r.id === relationshipId,
    ),
    parentPartnerIds = findPartnerIds(parentNodeId1, nodes),
    suggestedParent2 =
      mode === "edit" &&
      selectedRelation?.kind === "child" &&
      parentNodeId1 &&
      !parentNodeId2 &&
      parentPartnerIds.length === 1
        ? nodes.find((node) => node.id === parentPartnerIds[0])
        : undefined,
    submit = (e: FormEvent) => {
      e.preventDefault();
      const anchor = nodes.find((n) => n.id === anchorNodeId),
        base = anchor?.position || value?.position || { x: 240, y: 180 },
        placed =
          mode === "add"
            ? findFreePosition(
                base,
                placementDirection,
                nodes.filter((n) => n.id !== value?.id).map((n) => n.position),
              )
            : value?.position || base;
      onSubmit({
        relationshipId,
        genderId,
        anchorNodeId: nodes.length ? anchorNodeId : null,
        parentNodeId1,
        parentNodeId2,
        placementDirection,
        connectionDirection,
        divorced,
        memo: memo.slice(0, 2000),
        fontSize,
        relationshipFontSize,
        scale: value?.data.scale || 1,
        x: placed.x,
        y: placed.y,
      });
    };
  return (
    <form className="node-form" onSubmit={submit}>
      <div className="panel-title">
        <span className="eyebrow">
          {mode === "add" ? "NEW NODE" : "SELECTED NODE"}
        </span>
        <h2>
          {mode === "add" && preset
            ? quickRelationLabels[preset.kind]
            : mode === "add"
              ? "ノードを追加"
              : "ノードを編集"}
        </h2>
      </div>
      {preset && presetAnchor && (
        <p className="family-context">
          基準人物：<strong>{presetAnchor.data.relationshipName}</strong>
          {presetAnchor.data.memo
            ? ` — ${presetAnchor.data.memo.slice(0, 20)}`
            : ""}
        </p>
      )}
      {nodes.length > 0 && !preset && (
        <label>
          基準ノード
          <select
            value={anchorNodeId || ""}
            onChange={(e) => setAnchor(e.target.value)}
            required
          >
            <option value="" disabled>
              選択してください
            </option>
            {options.map((n) => (
              <option value={n.id} key={n.id}>
                {n.data.relationshipName}
                {n.data.memo ? ` — ${n.data.memo.slice(0, 14)}` : ""}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        続柄
        <select
          value={relationshipId}
          onChange={(e) => setRelationship(e.target.value)}
          required
        >
          {activeR.map((r) => (
            <option value={r.id} key={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        {preset && !activeR.length && (
          <small className="field-error">
            この関係種別の続柄がありません。表示設定で追加してください。
          </small>
        )}
      </label>
      <label>
        性別
        <select
          value={genderId}
          onChange={(e) => setGender(e.target.value)}
          required
        >
          {activeG.map((g) => (
            <option value={g.id} key={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </label>
      {mode === "add" && !preset && (
        <label>
          配置方向
          <select
            value={placementDirection}
            onChange={(e) => setDirection(e.target.value as Direction)}
          >
            {Object.entries(directionLabels).map(([k, n]) => (
              <option key={k} value={k}>
                {n}
              </option>
            ))}
          </select>
        </label>
      )}
      {mode === "edit" && (
        <label>
          線の接続方向
          <select
            value={connectionDirection || ""}
            disabled={!anchorNodeId || hasParentPair}
            onChange={(e) => {
              const direction = (e.target.value || null) as Direction | null;
              setConnectionDirection(direction);
              onConnectionPreview?.(direction);
            }}
          >
            <option value="">自動（現在位置から判定）</option>
            {Object.entries(directionLabels).map(([k, n]) => (
              <option key={k} value={k}>
                {n}
              </option>
            ))}
          </select>
          {hasParentPair && (
            <small className="field-hint">兄弟線は自動配置されます。</small>
          )}
        </label>
      )}
      {preset?.kind === "child" && (
        <fieldset className="parent-pair">
          <legend>もう一方の親</legend>
          <p>配偶者を選ぶと、その二人の子として家族線を作ります。</p>
          <label>
            配偶者
            <select
              value={parentNodeId2 || ""}
              onChange={(e) => setParent2(e.target.value || null)}
            >
              <option value="">指定しない（片親）</option>
              {options
                .filter((node) => partnerIds.includes(node.id))
                .map((node) => (
                  <option value={node.id} key={node.id}>
                    {node.data.relationshipName}
                    {node.data.memo ? ` — ${node.data.memo.slice(0, 14)}` : ""}
                  </option>
                ))}
            </select>
          </label>
          {!partnerIds.length && (
            <small className="field-hint">
              配偶者が未登録のため、片親の子として追加します。
            </small>
          )}
          {partnerIds.length === 1 && (
            <small className="field-hint">
              配偶者をもう一方の親として自動選択しました。
            </small>
          )}
          {partnerIds.length > 1 && (
            <small className="field-hint">
              配偶者が複数います。どの配偶者との子か選択してください。
            </small>
          )}
        </fieldset>
      )}
      {(mode === "edit" || !preset || preset.kind === "sibling") && (
        <fieldset className="parent-pair">
          <legend>兄弟姉妹追加時に</legend>
          <p>
            兄弟姉妹を追加する場合は、同じ父母を指定すると共通の兄弟線でまとめられます。
          </p>
          <label>
            父
            <select
              value={parentNodeId1 || ""}
              onChange={(e) => setParent1(e.target.value || null)}
            >
              <option value="">指定なし</option>
              {options
                .filter((n) => n.id !== parentNodeId2)
                .map((n) => (
                  <option value={n.id} key={n.id}>
                    {n.data.relationshipName}
                    {n.data.memo ? ` — ${n.data.memo.slice(0, 14)}` : ""}
                  </option>
                ))}
            </select>
          </label>
          <label>
            母
            <select
              value={parentNodeId2 || ""}
              onChange={(e) => setParent2(e.target.value || null)}
            >
              <option value="">指定なし</option>
              {options
                .filter((n) => n.id !== parentNodeId1)
                .map((n) => (
                  <option value={n.id} key={n.id}>
                    {n.data.relationshipName}
                    {n.data.memo ? ` — ${n.data.memo.slice(0, 14)}` : ""}
                  </option>
                ))}
            </select>
          </label>
          {suggestedParent2 && (
            <button
              type="button"
              className="button compact"
              onClick={() => setParent2(suggestedParent2.id)}
            >
              配偶者「{suggestedParent2.data.relationshipName}」を母に設定
            </button>
          )}
          {!pairValid && (
            <small className="field-error">
              父と母は異なる2名を選択してください。
            </small>
          )}
        </fieldset>
      )}
      {mode === "edit" &&
        (selectedRelation?.kind === "partner" ||
          selectedRelation?.kind === "divorce") && (
          <button
            type="button"
            className={`button wide divorce-toggle ${divorced ? "danger" : ""}`}
            aria-pressed={divorced}
            onClick={() => setDivorced((current) => !current)}
          >
            {divorced ? "離婚を解除" : "離婚に設定（二重斜線）"}
          </button>
        )}
      <NodeTextFields
        memo={memo}
        fontSize={fontSize}
        relationshipFontSize={relationshipFontSize}
        onMemoChange={(nextMemo) => {
          setMemo(nextMemo);
          if (mode === "edit" && draftNodeId)
            onDraftChange?.({
              nodeId: draftNodeId,
              memo: nextMemo,
              fontSize,
              relationshipFontSize,
            });
        }}
        onFontSizeChange={(nextFontSize) => {
          setFontSize(nextFontSize);
          if (mode === "edit" && draftNodeId)
            onDraftChange?.({
              nodeId: draftNodeId,
              memo,
              fontSize: nextFontSize,
              relationshipFontSize,
            });
        }}
        onRelationshipFontSizeChange={(nextRelationshipFontSize) => {
          setRelationshipFontSize(nextRelationshipFontSize);
          if (mode === "edit" && draftNodeId)
            onDraftChange?.({
              nodeId: draftNodeId,
              memo,
              fontSize,
              relationshipFontSize: nextRelationshipFontSize,
            });
        }}
      />
      <button
        className="button primary wide"
        disabled={!relationshipId || !genderId || !pairValid}
      >
        {mode === "add" ? (
          <>
            <Plus size={17} />
            自動配置して追加
          </>
        ) : (
          <>
            <Check size={17} />
            変更を保存
          </>
        )}
      </button>
      {mode === "edit" && (
        <button type="button" className="button danger wide" onClick={onDelete}>
          <Trash2 size={17} />
          ノードを削除
        </button>
      )}
    </form>
  );
}

export default ChartEditor;
