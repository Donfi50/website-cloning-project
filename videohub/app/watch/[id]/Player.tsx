"use client";
import { useEffect, useRef } from "react";
import Hls from "hls.js";

export default function Player({ src, id }: { src: string; id: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const counted = useRef(false);
  const watched = useRef(0);          // seconds actually played (seeking doesn't add to it)
  const last = useRef<number | null>(null);

  useEffect(() => {
    const v = ref.current!;
    if (v.canPlayType("application/vnd.apple.mpegurl")) { v.src = src; return; }
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(v);
      return () => hls.destroy();
    }
  }, [src]);

  return (
    <video
      ref={ref}
      controls
      className="player"
      onSeeking={() => { last.current = null; }}
      onTimeUpdate={e => {
        if (counted.current) return;
        const v = e.currentTarget;
        const t = v.currentTime;
        if (last.current !== null) {
          const d = t - last.current;
          if (d > 0 && d < 1.5) watched.current += d;
        }
        last.current = t;
        // A view = 5 seconds of real playback (or half of a very short video).
        if (watched.current >= Math.min(5, (v.duration || 10) / 2)) {
          counted.current = true;
          fetch("/api/view", { method: "POST", body: JSON.stringify({ id }) });
        }
      }}
    />
  );
}
