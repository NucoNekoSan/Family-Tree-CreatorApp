import {
  COHABITATION_DOCUMENT_VERSION,
  emptyCohabitationDocument,
  isCohabitation,
  isCohabitationDocument,
  isCohabitationLabel,
  type CohabitationDocument,
} from "./cohabitationModel";

export interface CohabitationStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const browserStorage = (): CohabitationStorage | null => {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
};

export const cohabitationDocumentKey = (chartId: string) =>
  `kakeizu:cohabitation-draft:v1:${chartId}`;
export const legacyCohabitationsKey = (chartId: string) =>
  `kakeizu:cohabitations:${chartId}`;
export const legacyCohabitationLabelsKey = (chartId: string) =>
  `kakeizu:cohabitation-labels:${chartId}`;

const decode = (raw: string | null): unknown => {
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const safeGet = (storage: CohabitationStorage, key: string) => {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

export function loadCohabitationDocument(
  chartId: string,
  storage: CohabitationStorage | null = browserStorage(),
): CohabitationDocument {
  if (!storage) return emptyCohabitationDocument();
  const currentRaw = safeGet(storage, cohabitationDocumentKey(chartId));
  const current = decode(currentRaw);
  if (isCohabitationDocument(current)) return current;
  if (currentRaw !== null) return emptyCohabitationDocument();

  const oldGroups = decode(safeGet(storage, legacyCohabitationsKey(chartId)));
  const oldLabels = decode(
    safeGet(storage, legacyCohabitationLabelsKey(chartId)),
  );
  const migrated: CohabitationDocument = {
    version: COHABITATION_DOCUMENT_VERSION,
    cohabitations:
      Array.isArray(oldGroups) && oldGroups.every(isCohabitation)
        ? oldGroups
        : [],
    labels:
      Array.isArray(oldLabels) && oldLabels.every(isCohabitationLabel)
        ? oldLabels
        : [],
  };

  if (migrated.cohabitations.length || migrated.labels.length) {
    if (saveCohabitationDocument(chartId, migrated, storage)) {
      try {
        storage.removeItem(legacyCohabitationsKey(chartId));
        storage.removeItem(legacyCohabitationLabelsKey(chartId));
      } catch {
        // Cleanup is optional; the versioned document is authoritative now.
      }
    }
  }
  return migrated;
}

export function saveCohabitationDocument(
  chartId: string,
  document: CohabitationDocument,
  storage: CohabitationStorage | null = browserStorage(),
): boolean {
  if (!storage || !isCohabitationDocument(document)) return false;
  try {
    storage.setItem(cohabitationDocumentKey(chartId), JSON.stringify(document));
    return true;
  } catch {
    return false;
  }
}

export { emptyCohabitationDocument };
