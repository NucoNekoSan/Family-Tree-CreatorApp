import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api";

export function useChartTitleSave(chartId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title: string) => api.updateChart(chartId, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["charts"] });
      queryClient.invalidateQueries({ queryKey: ["chart", chartId] });
    },
  });
}
