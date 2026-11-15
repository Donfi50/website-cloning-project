import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/authz";
import { POLICIES, guard } from "@/lib/ratelimit";

// Puts one of the signed-in user's failed videos back in the processing queue.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const limited = await guard(POLICIES.edit, user.id);
  if (limited) return limited;

  // One atomic update: only the owner's FAILED video qualifies.
  const res = await db.video.updateMany({
    where: { id, ownerId: user.id, status: "FAILED" },
    data: { status: "PROCESSING" },
  });
  if (res.count !== 1) return NextResponse.json({ error: "This video can't be retried" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
