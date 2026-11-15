"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AppealForm({ videoId }: { videoId: string }) {
  const [message, setMessage] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function send() {
    setBusy(true); setErr("");
    const r = await fetch("/api/appeals", { method: "POST", body: JSON.stringify({ videoId, message }) });
    if (r.ok) router.push("/studio");
    else { setErr((await r.json()).error ?? "Failed"); setBusy(false); }
  }
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <textarea rows={6} maxLength={2000} value={message} placeholder="Why was this removal a mistake?" onChange={e => setMessage(e.target.value)} />
      <button onClick={send} disabled={busy || message.trim().length < 10} style={{ justifySelf: "start" }}>
        {busy ? "Sending…" : "Send appeal"}
      </button>
      {err && <span style={{ color: "crimson" }}>{err}</span>}
    </div>
  );
}
