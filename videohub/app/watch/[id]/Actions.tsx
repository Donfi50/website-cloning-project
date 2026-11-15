"use client";
import { useState } from "react";

export function ReportButton({ videoId }: { videoId: string }) {
  const [msg, setMsg] = useState("");
  async function report() {
    const reason = prompt("Why are you reporting this video?");
    if (!reason) return;
    const r = await fetch("/api/report", { method: "POST", body: JSON.stringify({ videoId, reason }) });
    setMsg(r.ok ? "Thanks, we'll review it." : (await r.json()).error);
  }
  return <span><button onClick={report}>Report</button> {msg}</span>;
}

export function CommentForm({ videoId }: { videoId: string }) {
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");
  async function post() {
    const r = await fetch("/api/comments", { method: "POST", body: JSON.stringify({ videoId, body }) });
    if (r.ok) { setBody(""); window.location.reload(); } else setErr((await r.json()).error);
  }
  return (
    <div style={{ display: "grid", gap: 6, margin: "12px 0" }}>
      <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Add a comment" rows={2} />
      <button onClick={post} style={{ justifySelf: "start" }}>Comment</button>
      <span style={{ color: "crimson" }}>{err}</span>
    </div>
  );
}

export function LikeButton({ videoId, initialLiked, initialCount }: { videoId: string; initialLiked: boolean; initialCount: number }) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [msg, setMsg] = useState("");
  async function toggle() {
    setMsg("");
    const r = await fetch("/api/like", { method: "POST", body: JSON.stringify({ videoId }) });
    if (r.ok) { const d = await r.json(); setLiked(d.liked); setCount(d.count); }
    else setMsg((await r.json()).error ?? "Failed");
  }
  return (
    <span>
      <button onClick={toggle} aria-pressed={liked}>{liked ? "♥ Liked" : "♡ Like"} · {count}</button> {msg}
    </span>
  );
}
