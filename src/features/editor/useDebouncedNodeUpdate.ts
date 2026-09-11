import { useCallback, useEffect, useRef } from "react";
import type { ChartNodeRecord } from "../../types";

type Update = (input: Partial<Omit<ChartNodeRecord, "id">>) => void;

export function useDebouncedNodeUpdate(update: Update, delay = 500) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Partial<Omit<ChartNodeRecord, "id">> | null>(null);
  const updateRef = useRef(update);
  useEffect(() => {
    updateRef.current = update;
  }, [update]);
  const schedule = useCallback(
    (input: Partial<Omit<ChartNodeRecord, "id">>) => {
      pending.current = { ...pending.current, ...input };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const next = pending.current;
        pending.current = null;
        timer.current = null;
        if (next) updateRef.current(next);
      }, delay);
    },
    [delay],
  );
  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const next = pending.current;
    pending.current = null;
    if (next) updateRef.current(next);
  }, []);
  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    pending.current = null;
  }, []);
  useEffect(() => cancel, [cancel]);
  return { schedule, flush, cancel };
}
