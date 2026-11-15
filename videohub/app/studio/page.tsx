import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/authz";
import RetryButton from "./RetryButton";
import { formatCount } from "@/lib/format";

const LABEL: Record<string, string> = {
  UPLOADING: "Upload incomplete",
  PROCESSING: "Processing",
  READY: "Published",
  FAILED: "Processing failed",
};
const day = (d: Date) => d.toISOString().slice(0, 10);

export default async function Studio() {
  const me = await currentUser();
  if (!me) redirect("/signin");
  const [videos, removed] = await Promise.all([
    db.video.findMany({
      where: { ownerId: me.id, status: { not: "REMOVED" } },
      orderBy: { createdAt: "desc" },
    }),
    // Only videos a moderator removed (removedAt is set); videos the owner deleted are gone for good.
    db.video.findMany({
      where: { ownerId: me.id, status: "REMOVED", removedAt: { not: null } },
      orderBy: { removedAt: "desc" },
      include: { appeals: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
  ]);
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
      <h1>My videos</h1>
      <p><Link href="/upload">Upload a video</Link> · <Link href="/">Back to browsing</Link></p>
      {videos.map(v => (
        <div key={v.id} style={{ display: "flex", gap: 12, alignItems: "center", borderBottom: "1px solid #8884", padding: "10px 0" }}>
          <div style={{ flex: 1 }}>
            <b>{v.title}</b>
            <div style={{ fontSize: 13, opacity: 0.7 }}>{LABEL[v.status] ?? v.status} · {formatCount(v.views)} views</div>
          </div>
          {v.status === "READY" && <Link href={`/watch/${v.id}`}>Watch</Link>}
          {v.status === "FAILED" && <RetryButton id={v.id} />}
          <Link href={`/studio/${v.id}`}>Edit</Link>
        </div>
      ))}
      {!videos.length && <p>You haven't uploaded anything yet.</p>}

      {removed.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h2>Removed by a moderator</h2>
          <p style={{ fontSize: 14, opacity: 0.8 }}>If you think a removal was a mistake, you can appeal it once.</p>
          {removed.map(v => {
            // Only an appeal made after the latest removal counts: a restored video that is removed again can be appealed again.
            const a = v.appeals[0] && v.appeals[0].createdAt >= v.removedAt! ? v.appeals[0] : null;
            return (
              <div key={v.id} style={{ display: "flex", gap: 12, alignItems: "center", borderBottom: "1px solid #8884", padding: "10px 0" }}>
                <div style={{ flex: 1 }}>
                  <b>{v.title}</b>
                  <div style={{ fontSize: 13, opacity: 0.8 }}>Removed {day(v.removedAt!)} · Reason: {v.removedReason}</div>
                  {a?.status === "OPEN" && <div style={{ fontSize: 13 }}>Appeal sent {day(a.createdAt)}: waiting for review</div>}
                  {a?.status === "UPHELD" && (
                    <div style={{ fontSize: 13 }}>Appeal declined {day(a.decidedAt!)}{a.decisionNote ? `: ${a.decisionNote}` : ""}</div>
                  )}
                </div>
                {!a && <Link href={`/studio/appeal/${v.id}`}>Appeal</Link>}
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}
