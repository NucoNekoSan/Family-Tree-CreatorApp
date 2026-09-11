// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { cohabitationDocumentKey } from "./cohabitationStorage";
import { useCohabitationDocument } from "./useCohabitationDocument";

describe("useCohabitationDocument", () => {
  it("hydrates per chart and only persists dirty state", async () => {
    localStorage.clear();
    localStorage.setItem(
      cohabitationDocumentKey("one"),
      JSON.stringify({ version: 1, cohabitations: [], labels: [] }),
    );
    localStorage.setItem(
      cohabitationDocumentKey("two"),
      JSON.stringify({
        version: 1,
        cohabitations: [],
        labels: [{ id: "two-label", x: 4, y: 5, fontSize: 18 }],
      }),
    );
    const { result, rerender } = renderHook(
      ({ chartId }) => useCohabitationDocument(chartId),
      { initialProps: { chartId: "one" } },
    );
    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    act(() => {
      result.current.setDocument((document) => ({
        ...document,
        labels: [{ id: "one-label", x: 1, y: 2, fontSize: 20 }],
      }));
    });
    await waitFor(() => expect(result.current.isDirty).toBe(false));
    expect(
      JSON.parse(localStorage.getItem(cohabitationDocumentKey("one"))!).labels,
    ).toHaveLength(1);

    rerender({ chartId: "two" });
    await waitFor(() =>
      expect(result.current.cohabitationLabels[0]?.id).toBe("two-label"),
    );
    expect(result.current.isHydrated).toBe(true);
    expect(result.current.isDirty).toBe(false);
  });

  it("persists empty arrays after the final deletion", async () => {
    localStorage.clear();
    const { result } = renderHook(() => useCohabitationDocument("chart"));
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    act(() => result.current.setDocument((d) => ({ ...d, labels: [] })));
    await waitFor(() => expect(result.current.isDirty).toBe(false));
    expect(
      JSON.parse(localStorage.getItem(cohabitationDocumentKey("chart"))!),
    ).toEqual({ version: 1, cohabitations: [], labels: [] });
  });

  it("keeps dirty data and exposes an error when storage rejects writes", async () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota exceeded");
      },
      removeItem: () => undefined,
    };
    const { result } = renderHook(() =>
      useCohabitationDocument("chart", storage),
    );
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    act(() =>
      result.current.setCohabitationLabels([
        { id: "label", x: 1, y: 2, fontSize: 20 },
      ]),
    );
    await waitFor(() => expect(result.current.storageError).toBe(true));
    expect(result.current.isDirty).toBe(true);
    expect(result.current.cohabitationLabels).toHaveLength(1);
  });
});
