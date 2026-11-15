"use client";
import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    const v = new URLSearchParams(location.search).get("verified");
    if (v === "1") setNote("Email verified. You can sign in now.");
    if (v === "0") setNote("That verification link is invalid or expired. Enter your email below and request a new one.");
  }, []);

  async function submit() {
    setErr("");
    const r = await signIn("credentials", { email, password, redirect: false });
    if (r?.error) setErr("Wrong email or password, your email isn't verified yet, or the account is suspended (check your email).");
    else window.location.href = "/";
  }
  async function resend() {
    if (!email) return setErr("Enter your email first.");
    await fetch("/api/resend", { method: "POST", body: JSON.stringify({ email }) });
    setErr(""); setNote("If that account needs verification, a new email is on its way.");
  }
  return (
    <main style={{ maxWidth: 360, margin: "60px auto", display: "grid", gap: 10 }}>
      <h1>Sign in</h1>
      {note && <p>{note}</p>}
      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
      <button onClick={submit}>Sign in</button>
      <p style={{ color: "crimson" }}>{err}</p>
      <button onClick={resend} style={{ background: "none", border: 0, textDecoration: "underline", cursor: "pointer", justifySelf: "start" }}>
        Resend verification email
      </button>
      <Link href="/forgot">Forgot your password?</Link>
      <Link href="/register">Create an account</Link>
    </main>
  );
}
