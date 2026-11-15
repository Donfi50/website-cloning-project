import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPasswordReset } from "@/lib/tokens";
import { POLICIES, clientIp, guard } from "@/lib/ratelimit";

// Always answers ok so it can't be used to discover which emails are registered.
export async function POST(req: Request) {
  const email = String((await req.json()).email ?? "").trim().toLowerCase();
  const limited = await guard(POLICIES.forgot, `${clientIp(req)}:${email}`);
  if (limited) return limited;
  const user = await db.user.findUnique({ where: { email } });
  if (user) {
    try { await sendPasswordReset(user); } catch (e) { console.error("reset email failed", e); }
  }
  return NextResponse.json({ ok: true });
}
