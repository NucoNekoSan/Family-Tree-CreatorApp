export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

let csrfToken = "";
export function setCsrfToken(token: string) {
  csrfToken = token;
}

export async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const method = init.method || "GET";
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  headers.set("Cache-Control", "no-cache");
  if (init.body) headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD"].includes(method)) headers.set("X-CSRF-Token", csrfToken);
  const base = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  const url = new URL(
    `${base.replace(/^\//, "")}api${path}`,
    `${location.origin}/`,
  ).href;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 15_000);
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers,
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      error instanceof DOMException && error.name === "AbortError"
        ? "サーバーの応答がタイムアウトしました。再度お試しください。"
        : "サーバーに接続できません。通信環境を確認してください。",
    );
  } finally {
    window.clearTimeout(timer);
  }

  const raw = await response.text();
  let payload: {
    data: T | null;
    error?: {
      code?: string;
      message?: string;
      fields?: Record<string, string>;
    } | null;
    csrfToken?: string;
  };
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new ApiError(
      response.status,
      "INVALID_RESPONSE",
      `API応答がHTMLに置き換わりました（HTTP ${response.status}）。ブラウザのキャッシュを削除して再読み込みしてください。`,
    );
  }
  if (!response.ok || payload.error) {
    throw new ApiError(
      response.status,
      payload.error?.code || "REQUEST_FAILED",
      payload.error?.message || "処理に失敗しました",
      payload.error?.fields,
    );
  }
  if (payload.csrfToken) setCsrfToken(payload.csrfToken);
  return payload.data as T;
}

export const json = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});
