"use client";
import { useRouter } from "next/navigation";

export function RemoveItem({ playlistId, videoId }: { playlistId: string; videoId: string }) {
  const router = useRouter();
  async function remove() {
    const r = await fetch(`/api/playlists/${playlistId}/items`, { method: "DELETE", body: JSON.stringify({ videoId }) });
    if (r.ok) router.refresh();
  }
  return <button onClick={remove}>Remove</button>;
}

export function DeletePlaylist({ id }: { id: string }) {
  const router = useRouter();
  async function remove() {
    if (!confirm("Delete this playlist? The videos themselves aren't affected.")) return;
    const r = await fetch(`/api/playlists/${id}`, { method: "DELETE" });
    if (r.ok) router.push("/playlists");
  }
  return <button onClick={remove} style={{ color: "crimson", marginBottom: 8 }}>Delete playlist</button>;
}
