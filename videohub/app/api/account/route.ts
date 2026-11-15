import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/authz";
import { deleteVideoFiles } from "@/lib/s3";
import { POLICIES, guard } from "@/lib/ratelimit";

// Permanently deletes the signed-in user's account and everything they posted.
export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  // Wrong-password attempts count against this limit too.
  const limited = await guard(POLICIES.account, user.id);
  if (limited) return limited;

  const { password } = await req.json();
  if (typeof password !== "string" || !(await bcrypt.compare(password, user.passwordHash)))
    return NextResponse.json({ error: "Incorrect password" }, { status: 403 });
  if (user.role === "ADMIN" && (await db.user.count({ where: { role: "ADMIN" } })) <= 1)
    return NextResponse.json({ error: "You're the only admin. Make someone else an admin first." }, { status: 400 });

  const ids = (await db.video.findMany({ where: { ownerId: user.id }, select: { id: true } })).map(v => v.id);
  for (const id of ids) {
    try { await deleteVideoFiles(id); } catch (e) { console.error("file purge failed", id, e); }
  }

  // Likes, playlists, playlist items and email tokens cascade from the user/video rows.
  await db.$transaction([
    db.report.deleteMany({ where: { videoId: { in: ids } } }),
    db.comment.deleteMany({ where: { OR: [{ videoId: { in: ids } }, { userId: user.id }] } }),
    db.video.deleteMany({ where: { ownerId: user.id } }),
    db.user.delete({ where: { id: user.id } }),
  ]);
  // The session cookie stops working on the next request: the jwt callback rejects unknown users.
  return NextResponse.json({ ok: true });
}
