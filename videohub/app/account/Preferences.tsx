"use client";
import { useState } from "react";

export default function Preferences({ initialUploadEmails }: { initialUploadEmails: boolean }) {
  const [on, setOn] = useState(initialUploadEmails);
  const [msg, setMsg] = useState("");

  async function toggle(next: boolean) {
    setOn(next); setMsg("Saving…");
    const r = await fetch("/api/account/preferences", { method: "PATCH", body: JSON.stringify({ uploadEmails: next }) });
    if (r.ok) setMsg("Saved.");
    else { setOn(!next); setMsg((await r.json()).error ?? "Failed"); }
  }
  return (
    <div>
      <label>
        <input type="checkbox" checked={on} onChange={e => toggle(e.target.checked)} /> Email me when my uploads finish processing or fail
      </label>
      <p style={{ fontSize: 14, opacity: 0.7, margin: "4px 0" }}>
        We always send emails about your account itself: verification, password resets, and moderation decisions about your videos. {msg}
      </p>
    </div>
  );
}
