// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./api";

afterEach(() => vi.unstubAllGlobals());

describe("api client", () => {
  it("reuses the authenticated CSRF token for writes", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { user: { id: "u", loginId: "user" }, csrfToken: "csrf" },
            error: null,
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "c",
              title: "Map",
              nodeCount: 0,
              updatedAt: "2026-09-08T00:00:00Z",
            },
            error: null,
          }),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    await api.login("user", "password-password");
    await api.createChart("Map");
    const headers = new Headers(fetchMock.mock.calls[1][1]?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf");
  });

  it("returns a typed error when the response is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html />", { status: 502 })),
    );
    await expect(api.charts()).rejects.toMatchObject({
      status: 502,
      code: "INVALID_RESPONSE",
    } satisfies Partial<ApiError>);
  });
});
