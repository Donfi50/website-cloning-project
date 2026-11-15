"use client";
import { useState } from "react";

export default function Forgot() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    const r = await fetch("/api/forgot", { method: "POST", body: JSON.stringify({ email }) });
    if (r.ok) setSent(true);
    else setErr((await r.json()).error ?? "Something went wrong");
  }
  if (sent)
    return (
      <main style={{ maxWidth: 360, margin: "60px auto" }}>
        <h1>Check your email</h1>
        <p>If an account exists for {email}, a reset link is on its way. It's valid for 1 hour.</p>
      </main>
    );
  return (
    <main style={{ maxWidth: 360, margin: "60px auto", display: "grid", gap: 10 }}>
      <h1>Reset your password</h1>
      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <button onClick={submit}>Send reset link</button>
      <p style={{ color: "crimson" }}>{err}</p>
    </main>
  );
}
