"use client";
import { useState } from "react";

type Item = { id: string; name: string; has: boolean };

export default function SaveToPlaylist({ videoId, signedIn, initial }: { videoId: string; signedIn: boolean; initial: Item[] }) {
  const [lists, setLists] = useState(initial);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");

  if (!signedIn) return <p><a href="/signin">Sign in</a> to save videos to playlists.</p>;

  async function toggle(p: Item) {
    setMsg("");
    const r = await fetch(`/api/playlists/${p.id}/items`, { method: p.has ? "DELETE" : "POST", body: JSON.stringify({ videoId }) });
    if (r.ok) setLists(ls => ls.map(x => (x.id === p.id ? { ...x, has: !x.has } : x)));
    else setMsg((await r.json()).error ?? "Failed");
  }
  async function create() {
    setMsg("");
    const c = await fetch("/api/playlists", { method: "POST", body: JSON.stringify({ name }) });
    if (!c.ok) return setMsg((await c.json()).error ?? "Failed");
    const p = await c.json();
    const a = await fetch(`/api/playlists/${p.id}/items`, { method: "POST", body: JSON.stringify({ videoId }) });
    setLists(ls => [{ id: p.id, name: p.name, has: a.ok }, ...ls]);
    setName("");
  }
  return (
    <details style={{ margin: "8px 0" }}>
      <summary style={{ cursor: "pointer" }}>Save to playlist</summary>
      <div style={{ display: "grid", gap: 6, padding: "8px 0" }}>
        {lists.map(p => (
          <label key={p.id}><input type="checkbox" checked={p.has} onChange={() => toggle(p)} /> {p.name}</label>
        ))}
        <div style={{ display: "flex", gap: 6 }}>
          <input value={name} maxLength={80} placeholder="New playlist" onChange={e => setName(e.target.value)} />
          <button onClick={create} disabled={!name.trim()}>Create and save</button>
        </div>
        {msg && <span style={{ color: "crimson" }}>{msg}</span>}
      </div>
    </details>
  );
}
