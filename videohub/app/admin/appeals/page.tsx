import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser, requireMod } from "@/lib/authz";
import { decideAppeal } from "@/lib/moderation";
import AdminNav from "@/components/AdminNav";

async function decide(fd: FormData) {
  "use server";
  const actor = await requireMod();
  const decision = String(fd.get("decision"));
  const err = decision === "GRANTED" || decision === "UPHELD"
    ? await decideAppeal(actor, String(fd.get("appealId")), decision, String(fd.get("note") ?? ""))
    : "Invalid decision";
  revalidatePath("/admin/appeals");
  if (err) redirect(`/admin/appeals?${new URLSearchParams({ msg: err })}`);
}

export default async function Appeals({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const me = await currentUser();
  if (!me || me.role === "USER") notFound();
  const { msg } = await searchParams;
  const appeals = await db.appeal.findMany({
    where: { status: "OPEN" },
    include: { user: { select: { name: true, email: true } }, video: true },
    orderBy: { createdAt: "asc" },
  });
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
      <AdminNav />
      <h1>Appeals ({appeals.length})</h1>
      {msg && <p style={{ color: "crimson" }}>{msg}</p>}
      {appeals.map(a => (
        <div key={a.id} style={{ border: "1px solid #8884", borderRadius: 8, padding: 12, marginBottom: 10 }}>
          <b>{a.video.title}</b> <span style={{ opacity: 0.6 }}>by {a.user.name} ({a.user.email})</span>
          <div style={{ fontSize: 13, opacity: 0.8 }}>
            Removed {a.video.removedAt?.toISOString().slice(0, 10)} for: {a.video.removedReason}
          </div>
          <p style={{ whiteSpace: "pre-wrap" }}>{a.message}</p>
          <form action={decide} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <input type="hidden" name="appealId" value={a.id} />
            <input name="note" maxLength={1000} placeholder="Note to the uploader (required to uphold)" style={{ flex: 1, minWidth: 220 }} />
            <button name="decision" value="GRANTED">Grant (restore video)</button>
            <button name="decision" value="UPHELD">Uphold removal</button>
          </form>
        </div>
      ))}
      {!appeals.length && <p>No open appeals.</p>}
    </main>
  );
}
