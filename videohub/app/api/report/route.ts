import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/authz";
import { POLICIES, guard } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to report" }, { status: 401 });
  const limited = await guard(POLICIES.report, user.id);
  if (limited) return limited;
  const { videoId, reason } = await req.json();
  if (!videoId || !reason || String(reason).length > 1000)
    return NextResponse.json({ error: "Invalid report" }, { status: 400 });
  await db.report.create({ data: { videoId, reason: String(reason) } });
  return NextResponse.json({ ok: true });
}
