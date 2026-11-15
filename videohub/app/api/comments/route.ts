import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/authz";
import { POLICIES, guard } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to comment" }, { status: 401 });
  const limited = await guard(POLICIES.comment, user.id);
  if (limited) return limited;
  const { videoId, body } = await req.json();
  const text = String(body ?? "").trim();
  if (!videoId || !text || text.length > 2000) return NextResponse.json({ error: "Invalid comment" }, { status: 400 });
  await db.comment.create({ data: { videoId, body: text, userId: user.id } });
  return NextResponse.json({ ok: true });
}
