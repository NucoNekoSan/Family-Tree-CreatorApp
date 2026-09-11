import { useMutation } from "@tanstack/react-query";
import { useRef } from "react";
import { api } from "../../api";
import type { ChartDetail, ChartNodeRecord } from "../../types";
import type { FamilyNodeData } from "../../familyGraph";
import type { Node } from "@xyflow/react";
import { toNodeLayout } from "./nodeLayout";

type SaveState = (state: "saved" | "saving" | "error") => void;

export function useChartNodeMutations(
  chartId: string,
  refresh: (detail: ChartDetail) => void,
  setSaveState: SaveState,
  onDeleted: () => void,
) {
  const savingStartedAt = useRef(0);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markSaved = () => {
    if (savedTimer.current) clearTimeout(savedTimer.current);
    const remaining = Math.max(0, 500 - (Date.now() - savingStartedAt.current));
    savedTimer.current = setTimeout(() => {
      savedTimer.current = null;
      setSaveState("saved");
    }, remaining);
  };
  const mutationOptions = {
    onMutate: () => {
      savingStartedAt.current = Date.now();
      if (savedTimer.current) clearTimeout(savedTimer.current);
      setSaveState("saving");
    },
    onSuccess: (detail: ChartDetail) => {
      refresh(detail);
      markSaved();
    },
    onError: () => setSaveState("error"),
  };
  const create = useMutation({
    mutationFn: (value: Omit<ChartNodeRecord, "id">) =>
      api.createNode(chartId, value),
    ...mutationOptions,
  });
  const update = useMutation({
    mutationFn: ({
      nodeId,
      input,
    }: {
      nodeId: string;
      input: Partial<Omit<ChartNodeRecord, "id">>;
    }) => api.updateNode(chartId, nodeId, input),
    ...mutationOptions,
  });
  const layout = useMutation({
    mutationFn: (nodes: Node<FamilyNodeData>[]) =>
      api.updateNodeLayout(chartId, toNodeLayout(nodes)),
    ...mutationOptions,
  });
  const remove = useMutation({
    mutationFn: (nodeId: string) => api.deleteNode(chartId, nodeId),
    ...mutationOptions,
    onSuccess: (detail) => {
      onDeleted();
      refresh(detail);
      markSaved();
    },
  });
  return { create, update, layout, remove };
}
