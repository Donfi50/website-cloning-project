"use client";
import { useState } from "react";

export default function Register() {
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  async function submit() {
    const r = await fetch("/api/register", { method: "POST", body: JSON.stringify(f) });
    if (!r.ok) return setErr((await r.json()).error ?? "Failed");
    setDone(true);
  }
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  if (done)
    return (
      <main style={{ maxWidth: 360, margin: "60px auto" }}>
        <h1>Check your email</h1>
        <p>We sent a verification link to {f.email}. It's valid for 24 hours. After confirming, <a href="/signin">sign in</a>.</p>
      </main>
    );
  return (
    <main style={{ maxWidth: 360, margin: "60px auto", display: "grid", gap: 10 }}>
      <h1>Create account</h1>
      <input placeholder="Name" onChange={set("name")} />
      <input placeholder="Email" onChange={set("email")} />
      <input type="password" placeholder="Password (8+ characters)" onChange={set("password")} />
      <button onClick={submit}>Sign up</button>
      <p style={{ color: "crimson" }}>{err}</p>
    </main>
  );
}
