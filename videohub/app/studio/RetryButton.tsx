"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RetryButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const router = useRouter();

  async function retry() {
    setBusy(true); setErr("");
    const r = await fetch(`/api/videos/${id}/retry`, { method: "POST" });
    if (r.ok) router.refresh();
    else { setErr((await r.json()).error ?? "Failed"); setBusy(false); }
  }
  return (
    <span>
      <button onClick={retry} disabled={busy}>{busy ? "Queued…" : "Retry"}</button>
      {err && <span style={{ color: "crimson", marginLeft: 6 }}>{err}</span>}
    </span>
  );
}
