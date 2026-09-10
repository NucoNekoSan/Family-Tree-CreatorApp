import type {
  ChartDetail,
  ChartNodeLayout,
  ChartNodeRecord,
  ChartSummary,
} from "../types";
import { json, request } from "./transport";

export const chartApi = {
  charts: () => request<ChartSummary[]>("/charts"),
  chart: (id: string) => request<ChartDetail>(`/charts/${id}`),
  createChart: (title: string) =>
    request<ChartSummary>("/charts", json("POST", { title })),
  updateChart: (id: string, title: string) =>
    request<ChartSummary>(`/charts/${id}`, json("PATCH", { title })),
  deleteChart: (id: string) => request<void>(`/charts/${id}`, json("DELETE")),
  createNode: (chartId: string, input: Omit<ChartNodeRecord, "id">) =>
    request<ChartDetail>(`/charts/${chartId}/nodes`, json("POST", input)),
  updateNode: (
    chartId: string,
    nodeId: string,
    input: Partial<Omit<ChartNodeRecord, "id">>,
  ) =>
    request<ChartDetail>(
      `/charts/${chartId}/nodes/${nodeId}`,
      json("PATCH", input),
    ),
  deleteNode: (chartId: string, nodeId: string) =>
    request<ChartDetail>(`/charts/${chartId}/nodes/${nodeId}`, json("DELETE")),
  updateNodeLayout: (chartId: string, nodes: ChartNodeLayout[]) =>
    request<ChartDetail>(
      `/charts/${chartId}/nodes/layout`,
      json("PATCH", { nodes }),
    ),
};
