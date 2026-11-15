import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/authz";
import { POLICIES, guard } from "@/lib/ratelimit";

type Ctx = { params: Promise<{ id: string }> };
const MAX_ITEMS = 500;

async function ownedPlaylist(id: string) {
  const user = await currentUser();
  if (!user) return { res: NextResponse.json({ error: "Sign in first" }, { status: 401 }) };
  const limited = await guard(POLICIES.playlist, user.id);
  if (limited) return { res: limited };
  const playlist = await db.playlist.findFirst({ where: { id, ownerId: user.id } });
  if (!playlist) return { res: NextResponse.json({ error: "Playlist not found" }, { status: 404 }) };
  return { playlist };
}

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const o = await ownedPlaylist(id);
  if (o.res) return o.res;
  const videoId = String((await req.json()).videoId ?? "");

  const video = await db.video.findUnique({ where: { id: videoId }, select: { status: true } });
  if (!video || video.status !== "READY") return NextResponse.json({ error: "Video not found" }, { status: 404 });
  if ((await db.playlistItem.count({ where: { playlistId: id } })) >= MAX_ITEMS)
    return NextResponse.json({ error: `Playlists hold up to ${MAX_ITEMS} videos` }, { status: 400 });

  await db.playlistItem.upsert({
    where: { playlistId_videoId: { playlistId: id, videoId } },
    create: { playlistId: id, videoId },
    update: {},
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const { id } = await params;
  const o = await ownedPlaylist(id);
  if (o.res) return o.res;
  const videoId = String((await req.json()).videoId ?? "");
  await db.playlistItem.deleteMany({ where: { playlistId: id, videoId } });
  return NextResponse.json({ ok: true });
}
