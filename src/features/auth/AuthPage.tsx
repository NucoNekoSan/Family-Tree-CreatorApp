import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import { Logo, Notice } from "../../components/ui";
import { getErrorMessage } from "../../domain";

function AuthPage() {
  const nav = useNavigate(),
    [loginId, setLoginId] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: () => api.login(loginId, password),
    onSuccess: () => nav("/charts"),
    onError: (e) => setError(getErrorMessage(e)),
  });
  return (
    <main className="auth-page">
      <section className="auth-art">
        <Logo />
        <div>
          <span className="kicker">PRIVATE FAMILY MAP</span>
          <h1>
            つながりを、
            <br />
            静かに整える。
          </h1>
          <p>名前や生年を使わず、続柄とメモだけで家族の関係を可視化します。</p>
        </div>
        <div className="art-tree">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      </section>
      <section className="auth-panel">
        <form
          className="auth-card"
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            mutation.mutate();
          }}
        >
          <span className="eyebrow">KAKEIZU STUDIO</span>
          <h2>ログイン</h2>
          <p>ログインIDとパスワードを入力してください。</p>
          {error && (
            <div role="alert" aria-live="polite">
              <Notice tone="error">{error}</Notice>
            </div>
          )}
          <label htmlFor="login-id">
            ログインID
            <input
              id="login-id"
              name="loginId"
              type="text"
              autoComplete="username"
              maxLength={64}
              required
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="ログインID"
            />
          </label>
          <label htmlFor="login-password">
            パスワード
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              minLength={12}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="12文字以上"
            />
          </label>
          <button className="button primary wide" disabled={mutation.isPending}>
            {mutation.isPending ? "ログイン中…" : "ログイン"}
          </button>
        </form>
      </section>
    </main>
  );
}
export default AuthPage;
