import type { User } from "../types";
import { json, request, setCsrfToken } from "./transport";

type SessionResponse = { user: User; csrfToken: string };
const rememberCsrf = (response: SessionResponse) => {
  setCsrfToken(response.csrfToken);
  return response;
};

export const authApi = {
  session: () => request<SessionResponse>("/auth/session").then(rememberCsrf),
  login: (loginId: string, password: string) =>
    request<SessionResponse>(
      "/auth/login",
      json("POST", { loginId, password }),
    ).then(rememberCsrf),
  logout: () => request<void>("/auth/logout", json("POST")),
};
