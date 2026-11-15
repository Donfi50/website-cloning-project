"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Upload() {
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const router = useRouter();

  async function submit() {
    if (!file || !title) return;
    setStatus("Preparing…");
    const r = await fetch("/api/upload", {
      method: "POST",
      body: JSON.stringify({ title, tags, contentType: file.type, size: file.size }),
    });
    if (!r.ok) return setStatus((await r.json()).error ?? "Failed");
    const { id, url } = await r.json();
    setStatus("Uploading…");
    const put = await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
    if (!put.ok) return setStatus("Upload failed");
    await fetch("/api/upload", { method: "PUT", body: JSON.stringify({ id }) });
    setStatus("Processing. It will appear once ready.");
    setTimeout(() => router.push("/"), 1500);
  }

  return (
    <main style={{ maxWidth: 480, margin: "40px auto", display: "grid", gap: 12 }}>
      <h1>Upload a video</h1>
      <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
      <input placeholder="Tags, separated by commas (up to 8)" value={tags} onChange={e => setTags(e.target.value)} />
      <input type="file" accept="video/mp4,video/quicktime,video/webm" onChange={e => setFile(e.target.files?.[0] ?? null)} />
      <button onClick={submit}>Upload</button>
      <p>{status}</p>
    </main>
  );
}
