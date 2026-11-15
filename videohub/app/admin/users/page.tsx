import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser, requireMod } from "@/lib/authz";
import { setSuspension, setRole, removeAllVideosAsMod } from "@/lib/moderation";
import AdminNav from "@/components/AdminNav";

async function suspend(fd: FormData) {
  "use server";
  const actor = await requireMod();
  const reason = String(fd.get("reason") ?? "").trim().slice(0, 500);
  const q = String(fd.get("q") ?? "");
  const err = reason ? await setSuspension(actor, String(fd.get("userId")), reason) : "A reason is required";
  revalidatePath("/admin/users");
  if (err) redirect(`/admin/users?${new URLSearchParams({ q, msg: err })}`);
}
async function unsuspend(fd: FormData) {
  "use server";
  const actor = await requireMod();
  const q = String(fd.get("q") ?? "");
  const err = await setSuspension(actor, String(fd.get("userId")), null);
  revalidatePath("/admin/users");
  if (err) redirect(`/admin/users?${new URLSearchParams({ q, msg: err })}`);
}

async function changeRole(fd: FormData) {
  "use server";
  const actor = await requireMod();
  const q = String(fd.get("q") ?? "");
  const err = await setRole(actor, String(fd.get("userId")), String(fd.get("role")));
  revalidatePath("/admin/users");
  if (err) redirect(`/admin/users?${new URLSearchParams({ q, msg: err })}`);
}

async function removeAll(fd: FormData) {
  "use server";
  const actor = await requireMod();
  const reason = String(fd.get("reason") ?? "").trim().slice(0, 500);
  const q = String(fd.get("q") ?? "");
  const back = (k: "msg" | "info", v: string) => redirect(`/admin/users?${new URLSearchParams({ q, [k]: v })}`);
  if (!reason) return back("msg", "A reason is required");
  const r = await removeAllVideosAsMod(actor, String(fd.get("userId")), reason);
  revalidatePath("/admin/users");
  if (r.error) return back("msg", r.error);
  return back("info", `Removed ${r.count} video${r.count === 1 ? "" : "s"}`);
}

export default async function Users({ searchParams }: { searchParams: Promise<{ q?: string; msg?: string; info?: string }> }) {
  const me = await currentUser();
  if (!me || me.role === "USER") notFound();
  const { q = "", msg, info } = await searchParams;
  const users = await db.user.findMany({
    where: q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {},
    include: { _count: { select: { videos: true, comments: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <AdminNav />
      <h1>Users</h1>
      <form style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input name="q" defaultValue={q} placeholder="Search by name or email" style={{ flex: 1 }} />
        <button>Search</button>
      </form>
      {msg && <p style={{ color: "crimson" }}>{msg}</p>}
      {info && <p><b>{info}</b></p>}
      {users.map(u => (
        <div key={u.id} style={{ border: "1px solid #8884", borderRadius: 8, padding: 12, marginBottom: 10 }}>
          <b>{u.name}</b> · {u.email} <span style={{ opacity: 0.6 }}>({u.role})</span>
          <div style={{ fontSize: 13, opacity: 0.7 }}>
            Joined {u.createdAt.toISOString().slice(0, 10)} · {u.emailVerified ? "verified" : "unverified"} · {u._count.videos} videos · {u._count.comments} comments
          </div>
          {me.role === "ADMIN" && u.id !== me.id && (
            <form action={changeRole} style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <input type="hidden" name="userId" value={u.id} />
              <input type="hidden" name="q" value={q} />
              <select name="role" defaultValue={u.role}>
                <option value="USER">USER</option>
                <option value="MODERATOR">MODERATOR</option>
                <option value="ADMIN">ADMIN</option>
              </select>
              <button>Change role</button>
            </form>
          )}
          {u._count.videos > 0 && u.id !== me.id && (me.role === "ADMIN" || u.role === "USER") && (
            <form action={removeAll} style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <input type="hidden" name="userId" value={u.id} />
              <input type="hidden" name="q" value={q} />
              <input name="reason" required maxLength={500} placeholder="Reason to remove ALL their videos (emailed once)" style={{ flex: 1 }} />
              <button>Remove all videos</button>
            </form>
          )}
          {u.suspendedAt ? (
            <form action={unsuspend} style={{ marginTop: 8 }}>
              <input type="hidden" name="userId" value={u.id} />
              <input type="hidden" name="q" value={q} />
              <span style={{ color: "crimson" }}>Suspended: {u.suspendedReason} </span>
              <button>Lift suspension</button>
            </form>
          ) : u.id !== me.id ? (
            <form action={suspend} style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <input type="hidden" name="userId" value={u.id} />
              <input type="hidden" name="q" value={q} />
              <input name="reason" required maxLength={500} placeholder="Reason (emailed to the user)" style={{ flex: 1 }} />
              <button>Suspend</button>
            </form>
          ) : null}
        </div>
      ))}
      {!users.length && <p>No users found.</p>}
    </main>
  );
}
