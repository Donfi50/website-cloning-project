import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/authz";
import { deleteVideoFiles } from "@/lib/s3";
import { parseTags } from "@/lib/tags";
import { POLICIES, guard } from "@/lib/ratelimit";

type Ctx = { params: Promise<{ id: string }> };

// Returns the video only if it belongs to the signed-in user and hasn't been removed.
async function owned(id: string) {
  const user = await currentUser();
  if (!user) return { res: NextResponse.json({ error: "Sign in first" }, { status: 401 }) };
  const video = await db.video.findUnique({ where: { id } });
  if (!video || video.ownerId !== user.id || video.status === "REMOVED")
    return { res: NextResponse.json({ error: "Video not found" }, { status: 404 }) };
  return { user, video };
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const o = await owned(id);
  if (o.res) return o.res;
  const limited = await guard(POLICIES.edit, o.user!.id);
  if (limited) return limited;

  const body = await req.json();
  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "");
  if (!title || title.length > 120 || description.length > 5000)
    return NextResponse.json({ error: "Title is required (max 120 characters); description max 5000" }, { status: 400 });

  await db.video.update({ where: { id }, data: { title, description, tags: parseTags(body.tags) } });
  return NextResponse.json({ ok: true });
}

// Owner delete: hides the video and purges its files. The database row is kept so
// earlier reports and moderation history stay intact.
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const o = await owned(id);
  if (o.res) return o.res;
  const limited = await guard(POLICIES.edit, o.user!.id);
  if (limited) return limited;

  await db.video.update({ where: { id }, data: { status: "REMOVED", hlsPath: null, thumbPath: null } });
  try { await deleteVideoFiles(id); } catch (e) { console.error("file purge failed", id, e); }
  return NextResponse.json({ ok: true });
}
