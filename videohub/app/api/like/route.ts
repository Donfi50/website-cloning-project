import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/authz";
import { POLICIES, guard } from "@/lib/ratelimit";

// Toggles the signed-in user's like on a video and returns the new state and count.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to like videos" }, { status: 401 });
  const limited = await guard(POLICIES.like, user.id);
  if (limited) return limited;

  const { videoId } = await req.json();
  const video = await db.video.findUnique({ where: { id: String(videoId) }, select: { status: true } });
  if (!video || video.status !== "READY") return NextResponse.json({ error: "Video not found" }, { status: 404 });

  const key = { userId_videoId: { userId: user.id, videoId: String(videoId) } };
  const existing = await db.like.findUnique({ where: key });
  if (existing) {
    await db.like.deleteMany({ where: { userId: user.id, videoId: String(videoId) } });
  } else {
    try { await db.like.create({ data: { userId: user.id, videoId: String(videoId) } }); }
    catch (e: any) { if (e?.code !== "P2002") throw e; } // double-click race: already liked
  }
  const [liked, count] = await Promise.all([
    db.like.findUnique({ where: key }).then(Boolean),
    db.like.count({ where: { videoId: String(videoId) } }),
  ]);
  return NextResponse.json({ liked, count });
}
