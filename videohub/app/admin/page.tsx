import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { currentUser, requireMod } from "@/lib/authz";
import { removeVideoAsMod, dismissReport } from "@/lib/moderation";
import AdminNav from "@/components/AdminNav";

async function removeVideo(fd: FormData) {
  "use server";
  const actor = await requireMod();
  const reason = String(fd.get("reason") ?? "").trim().slice(0, 500);
  if (!reason) return; // a reason is required: it is emailed to the uploader and kept for appeals
  await removeVideoAsMod(actor, String(fd.get("videoId")), reason);
  revalidatePath("/admin");
}
async function dismiss(fd: FormData) {
  "use server";
  const actor = await requireMod();
  await dismissReport(actor, String(fd.get("reportId")));
  revalidatePath("/admin");
}

export default async function Admin() {
  const me = await currentUser();
  if (!me || me.role === "USER") notFound();
  const reports = await db.report.findMany({
    where: { resolved: false },
    include: { video: true },
    orderBy: { createdAt: "asc" },
  });
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
      <AdminNav />
      <h1>Moderation queue ({reports.length})</h1>
      {reports.map(r => (
        <div key={r.id} style={{ border: "1px solid #8884", borderRadius: 8, padding: 12, marginBottom: 10 }}>
          <b>{r.video.title}</b> <span style={{ opacity: 0.6 }}>({r.video.status})</span>
          <p>Reason: {r.reason}</p>
          <Link href={`/watch/${r.videoId}`}>View</Link>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <form action={removeVideo} style={{ display: "flex", gap: 6, flex: 1 }}>
              <input type="hidden" name="videoId" value={r.videoId} />
              <input name="reason" required maxLength={500} placeholder="Reason (emailed to the uploader)" style={{ flex: 1 }} />
              <button>Remove video</button>
            </form>
            <form action={dismiss}><input type="hidden" name="reportId" value={r.id} /><button>Dismiss</button></form>
          </div>
        </div>
      ))}
      {!reports.length && <p>Nothing to review.</p>}
    </main>
  );
}
