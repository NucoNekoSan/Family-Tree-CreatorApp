import { useCallback, useEffect, useRef } from "react";
import type { ChartNodeRecord } from "../../types";

export interface NodeUpdateTarget {
  chartId: string;
  nodeId: string;
}

export interface PendingNodeUpdate extends NodeUpdateTarget {
  input: Partial<Omit<ChartNodeRecord, "id">>;
}

type Update = (request: PendingNodeUpdate) => void;

function hasSameTarget(current: NodeUpdateTarget, next: NodeUpdateTarget) {
  return current.chartId === next.chartId && current.nodeId === next.nodeId;
}

export function useDebouncedNodeUpdate(update: Update, delay = 500) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<PendingNodeUpdate | null>(null);
  const updateRef = useRef(update);
  useEffect(() => {
    updateRef.current = update;
  }, [update]);
  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const next = pending.current;
    pending.current = null;
    if (next) updateRef.current(next);
  }, []);
  const schedule = useCallback(
    (request: PendingNodeUpdate) => {
      const current = pending.current;
      if (current && !hasSameTarget(current, request)) flush();
      pending.current = {
        chartId: request.chartId,
        nodeId: request.nodeId,
        input: { ...pending.current?.input, ...request.input },
      };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay);
    },
    [delay, flush],
  );
  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    pending.current = null;
  }, []);
  const cancelTarget = useCallback((target: NodeUpdateTarget) => {
    if (!pending.current || !hasSameTarget(pending.current, target)) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    pending.current = null;
  }, []);
  useEffect(() => flush, [flush]);
  return { schedule, flush, cancel, cancelTarget };
}
