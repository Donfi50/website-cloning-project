"use client";
import { useState } from "react";

export default function DeleteAccount() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true); setErr("");
    const r = await fetch("/api/account", { method: "DELETE", body: JSON.stringify({ password }) });
    if (r.ok) window.location.href = "/";
    else { setErr((await r.json()).error ?? "Failed"); setBusy(false); }
  }
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <input type="password" placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} />
      <input placeholder="Type DELETE to confirm" value={confirm} onChange={e => setConfirm(e.target.value)} />
      <button onClick={remove} disabled={busy || !password || confirm !== "DELETE"} style={{ color: "crimson", justifySelf: "start" }}>
        {busy ? "Deleting…" : "Permanently delete my account"}
      </button>
      {err && <span style={{ color: "crimson" }}>{err}</span>}
    </div>
  );
}
