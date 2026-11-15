import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/authz";
import { POLICIES, guard } from "@/lib/ratelimit";

// An uploader appeals a moderator's removal of one of their own videos: one appeal per removal.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const limited = await guard(POLICIES.appeal, user.id);
  if (limited) return limited;

  const { videoId, message } = await req.json();
  const text = String(message ?? "").trim();
  if (text.length < 10 || text.length > 2000)
    return NextResponse.json({ error: "Please explain in 10 to 2000 characters" }, { status: 400 });

  const video = await db.video.findUnique({ where: { id: String(videoId ?? "") } });
  if (!video || video.ownerId !== user.id || video.status !== "REMOVED" || !video.removedAt)
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  // A later removal of the same video (after a restore) can be appealed again.
  if (await db.appeal.findFirst({ where: { videoId: video.id, createdAt: { gte: video.removedAt } } }))
    return NextResponse.json({ error: "You've already appealed this removal" }, { status: 409 });

  await db.appeal.create({ data: { videoId: video.id, userId: user.id, message: text } });
  return NextResponse.json({ ok: true });
}
