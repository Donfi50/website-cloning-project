import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/authz";
import { POLICIES, guard } from "@/lib/ratelimit";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const limited = await guard(POLICIES.playlist, user.id);
  if (limited) return limited;
  const res = await db.playlist.deleteMany({ where: { id, ownerId: user.id } }); // items cascade
  if (res.count !== 1) return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
