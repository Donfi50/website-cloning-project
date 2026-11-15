"use client";
import { useEffect, useState } from "react";

export default function Reset() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => setToken(new URLSearchParams(location.search).get("token") ?? ""), []);

  async function submit() {
    const r = await fetch("/api/reset", { method: "POST", body: JSON.stringify({ token, password }) });
    if (r.ok) setDone(true);
    else setErr((await r.json()).error ?? "Something went wrong");
  }
  if (done)
    return (
      <main style={{ maxWidth: 360, margin: "60px auto" }}>
        <h1>Password updated</h1>
        <p><a href="/signin">Sign in</a> with your new password. Other devices have been signed out.</p>
      </main>
    );
  return (
    <main style={{ maxWidth: 360, margin: "60px auto", display: "grid", gap: 10 }}>
      <h1>Choose a new password</h1>
      <input type="password" placeholder="New password (8+ characters)" value={password} onChange={e => setPassword(e.target.value)} />
      <button onClick={submit} disabled={!token}>Update password</button>
      <p style={{ color: "crimson" }}>{token ? err : "This page needs the link from your reset email."}</p>
    </main>
  );
}
