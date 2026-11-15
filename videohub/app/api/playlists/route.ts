import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/authz";
import { POLICIES, guard } from "@/lib/ratelimit";

const MAX_PLAYLISTS = 50;

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const limited = await guard(POLICIES.playlist, user.id);
  if (limited) return limited;

  const name = String((await req.json()).name ?? "").trim();
  if (!name || name.length > 80) return NextResponse.json({ error: "Name is required (max 80 characters)" }, { status: 400 });
  if ((await db.playlist.count({ where: { ownerId: user.id } })) >= MAX_PLAYLISTS)
    return NextResponse.json({ error: `You can have up to ${MAX_PLAYLISTS} playlists` }, { status: 400 });

  const p = await db.playlist.create({ data: { name, ownerId: user.id } });
  return NextResponse.json({ id: p.id, name: p.name });
}
