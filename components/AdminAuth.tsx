"use client";

import { useState } from "react";

export function AdminLogin() {
  const [password, setPassword] = useState("");
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFailed(false);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (response.ok) {
        // cookie 是 HttpOnly，讀不到也不需要讀；重新載入讓伺服器重新判斷。
        window.location.reload();
        return;
      }
      setFailed(true);
    } catch {
      setFailed(true);
    }
    setBusy(false);
  }

  return (
    <form className="admin-login" onSubmit={submit}>
      <label htmlFor="admin-password">管理密碼</label>
      <input
        id="admin-password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />
      <button type="submit" disabled={busy || password.length === 0}>
        {busy ? "驗證中…" : "登入"}
      </button>
      {failed ? (
        <p role="alert" className="admin-error">
          密碼不正確。
        </p>
      ) : null}
    </form>
  );
}

export function AdminLogout() {
  async function logout() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      window.location.reload();
    }
  }

  return (
    <button className="admin-logout" type="button" onClick={() => void logout()}>
      登出
    </button>
  );
}
