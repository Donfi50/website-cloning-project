import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/authz";
import { POLICIES, guard } from "@/lib/ratelimit";

// Downloads everything stored about the signed-in user as JSON (password hash excluded).
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const limited = await guard(POLICIES.account, user.id);
  if (limited) return limited;

  const [videos, comments, likes, playlists] = await Promise.all([
    db.video.findMany({
      where: { ownerId: user.id },
      select: { id: true, title: true, description: true, tags: true, status: true, views: true, createdAt: true, removedReason: true, removedAt: true },
    }),
    db.comment.findMany({ where: { userId: user.id }, select: { videoId: true, body: true, createdAt: true } }),
    db.like.findMany({ where: { userId: user.id }, select: { videoId: true, createdAt: true } }),
    db.playlist.findMany({
      where: { ownerId: user.id },
      select: { name: true, createdAt: true, items: { select: { videoId: true, addedAt: true } } },
    }),
  ]);

  const data = {
    exportedAt: new Date().toISOString(),
    account: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt, emailVerified: user.emailVerified, uploadEmails: user.uploadEmails },
    videos, comments, likes, playlists,
  };
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="my-data.json"',
      "Cache-Control": "no-store",
    },
  });
}
