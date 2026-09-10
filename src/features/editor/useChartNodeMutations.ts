import { useMutation } from "@tanstack/react-query";
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
  const mutationOptions = {
    onMutate: () => setSaveState("saving"),
    onSuccess: refresh,
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
    },
  });
  return { create, update, layout, remove };
}
