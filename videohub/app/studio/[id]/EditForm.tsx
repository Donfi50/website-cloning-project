"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EditForm({ id, initial }: { id: string; initial: { title: string; description: string; tags: string } }) {
  const [f, setF] = useState(initial);
  const [msg, setMsg] = useState("");
  const router = useRouter();

  async function save() {
    setMsg("Saving…");
    const r = await fetch(`/api/videos/${id}`, { method: "PATCH", body: JSON.stringify(f) });
    setMsg(r.ok ? "Saved." : (await r.json()).error ?? "Failed");
    if (r.ok) router.refresh();
  }
  async function remove() {
    if (!confirm("Delete this video permanently? This can't be undone.")) return;
    const r = await fetch(`/api/videos/${id}`, { method: "DELETE" });
    if (r.ok) router.push("/studio");
    else setMsg((await r.json()).error ?? "Failed");
  }
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <input value={f.title} maxLength={120} placeholder="Title" onChange={e => setF({ ...f, title: e.target.value })} />
      <textarea value={f.description} rows={6} placeholder="Description" onChange={e => setF({ ...f, description: e.target.value })} />
      <input value={f.tags} placeholder="Tags, separated by commas (up to 8)" onChange={e => setF({ ...f, tags: e.target.value })} />
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={save}>Save</button>
        <button onClick={remove} style={{ marginLeft: "auto", color: "crimson" }}>Delete video</button>
      </div>
      <p>{msg}</p>
    </div>
  );
}
