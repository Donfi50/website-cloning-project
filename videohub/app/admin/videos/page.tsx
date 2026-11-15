import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { currentUser, requireMod } from "@/lib/authz";
import { removeVideoAsMod, restoreVideoAsMod } from "@/lib/moderation";
import AdminNav from "@/components/AdminNav";

async function removeVideo(fd: FormData) {
  "use server";
  const actor = await requireMod();
  const reason = String(fd.get("reason") ?? "").trim().slice(0, 500);
  if (!reason) return;
  await removeVideoAsMod(actor, String(fd.get("videoId")), reason);
  revalidatePath("/admin/videos");
}

async function restoreVideo(fd: FormData) {
  "use server";
  const actor = await requireMod();
  const q = String(fd.get("q") ?? "");
  const err = await restoreVideoAsMod(actor, String(fd.get("videoId")));
  revalidatePath("/admin/videos");
  if (err) redirect(`/admin/videos?${new URLSearchParams({ q, msg: err })}`);
}

export default async function Videos({ searchParams }: { searchParams: Promise<{ q?: string; msg?: string }> }) {
  const me = await currentUser();
  if (!me || me.role === "USER") notFound();
  const { q = "", msg } = await searchParams;
  const videos = await db.video.findMany({
    where: q
      ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { id: q }, { owner: { email: { contains: q, mode: "insensitive" } } }] }
      : {},
    include: { owner: { select: { name: true, email: true } }, _count: { select: { reports: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <AdminNav />
      <h1>Videos</h1>
      <form style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input name="q" defaultValue={q} placeholder="Search by title, video ID or uploader email" style={{ flex: 1 }} />
        <button>Search</button>
      </form>
      {msg && <p style={{ color: "crimson" }}>{msg}</p>}
      {videos.map(v => (
        <div key={v.id} style={{ border: "1px solid #8884", borderRadius: 8, padding: 12, marginBottom: 10 }}>
          <b>{v.title}</b> <span style={{ opacity: 0.6 }}>({v.status})</span>
          {v.status === "READY" && <> · <Link href={`/watch/${v.id}`}>Watch</Link></>}
          <div style={{ fontSize: 13, opacity: 0.7 }}>
            {v.owner.name} ({v.owner.email}) · {v.views} views · {v._count.reports} reports · {v.createdAt.toISOString().slice(0, 10)}
          </div>
          {v.removedReason && <div style={{ fontSize: 13 }}>Removed: {v.removedReason}</div>}
          {v.status === "REMOVED" && v.removedAt && v.hlsPath && (
            <form action={restoreVideo} style={{ marginTop: 8 }}>
              <input type="hidden" name="videoId" value={v.id} />
              <input type="hidden" name="q" value={q} />
              <button>Restore video</button>
            </form>
          )}
          {v.status !== "REMOVED" && (
            <form action={removeVideo} style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <input type="hidden" name="videoId" value={v.id} />
              <input name="reason" required maxLength={500} placeholder="Reason (emailed to the uploader)" style={{ flex: 1 }} />
              <button>Remove video</button>
            </form>
          )}
        </div>
      ))}
      {!videos.length && <p>No videos found.</p>}
    </main>
  );
}
