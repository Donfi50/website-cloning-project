"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateForm() {
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const router = useRouter();

  async function create() {
    setErr("");
    const r = await fetch("/api/playlists", { method: "POST", body: JSON.stringify({ name }) });
    if (r.ok) { setName(""); router.refresh(); }
    else setErr((await r.json()).error ?? "Failed");
  }
  return (
    <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
      <input value={name} maxLength={80} placeholder="New playlist name" onChange={e => setName(e.target.value)} style={{ flex: 1 }} />
      <button onClick={create} disabled={!name.trim()}>Create</button>
      {err && <span style={{ color: "crimson" }}>{err}</span>}
    </div>
  );
}
