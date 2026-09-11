import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SetStateAction,
} from "react";
import {
  emptyCohabitationDocument,
  type Cohabitation,
  type CohabitationLabel,
  type CohabitationDocument,
} from "./cohabitationModel";
import {
  loadCohabitationDocument,
  saveCohabitationDocument,
  type CohabitationStorage,
} from "./cohabitationStorage";

type DocumentUpdate =
  | CohabitationDocument
  | ((current: CohabitationDocument) => CohabitationDocument);

export function useCohabitationDocument(
  chartId: string,
  storage?: CohabitationStorage,
) {
  const [document, setDocumentState] = useState(emptyCohabitationDocument);
  const [hydratedChartId, setHydratedChartId] = useState<string | null>(null);
  const [isDirty, setDirty] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const chartIdRef = useRef(chartId);
  chartIdRef.current = chartId;

  useEffect(() => {
    const loaded = loadCohabitationDocument(chartId, storage);
    if (chartIdRef.current !== chartId) return;
    setDocumentState(loaded);
    setDirty(false);
    setStorageError(false);
    setHydratedChartId(chartId);
  }, [chartId, storage]);

  const setDocument = useCallback((update: DocumentUpdate) => {
    setDocumentState((current) =>
      typeof update === "function" ? update(current) : update,
    );
    setDirty(true);
  }, []);

  const setCohabitations = useCallback(
    (update: SetStateAction<Cohabitation[]>) =>
      setDocument((current) => ({
        ...current,
        cohabitations:
          typeof update === "function" ? update(current.cohabitations) : update,
      })),
    [setDocument],
  );
  const setCohabitationLabels = useCallback(
    (update: SetStateAction<CohabitationLabel[]>) =>
      setDocument((current) => ({
        ...current,
        labels: typeof update === "function" ? update(current.labels) : update,
      })),
    [setDocument],
  );

  useEffect(() => {
    if (!isDirty || hydratedChartId !== chartId) return;
    if (saveCohabitationDocument(chartId, document, storage)) {
      setDirty(false);
      setStorageError(false);
    } else {
      setStorageError(true);
    }
  }, [chartId, document, hydratedChartId, isDirty, storage]);

  const markDirty = useCallback(() => setDirty(true), []);
  const resetDirty = useCallback(() => setDirty(false), []);

  return {
    document,
    setDocument,
    cohabitations: document.cohabitations,
    setCohabitations,
    cohabitationLabels: document.labels,
    setCohabitationLabels,
    isHydrated: hydratedChartId === chartId,
    hydrated: hydratedChartId === chartId,
    isDirty,
    dirty: isDirty,
    markDirty,
    resetDirty,
    storageError,
  };
}
