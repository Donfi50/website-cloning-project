import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { POLICIES, clientIp, guard, limit } from "@/lib/ratelimit";

const BOT = /bot|crawler|spider|crawling|headless|preview|slurp|facebookexternalhit/i;

// Counts at most one view per viewer per video per 24 hours.
// Signed-in viewers are identified by account; others by a salted one-way hash of IP + browser,
// so no raw IP address is stored for this.
export async function POST(req: Request) {
  const id = String((await req.json()).id ?? "");
  const ip = clientIp(req);
  const limited = await guard(POLICIES.view, `${ip}:${id}`); // general abuse limit
  if (limited) return limited;

  const ua = req.headers.get("user-agent") ?? "";
  if (!id || BOT.test(ua)) return NextResponse.json({ ok: true, counted: false });

  const userId = ((await auth())?.user as any)?.id as string | undefined;
  const viewer = userId
    ? `u:${userId}`
    : "a:" + crypto.createHash("sha256").update(`${process.env.AUTH_SECRET}|${ip}|${ua}`).digest("hex").slice(0, 32);

  const first = await limit(POLICIES.viewOnce, `${viewer}:${id}`);
  if (first.ok) await db.video.updateMany({ where: { id, status: "READY" }, data: { views: { increment: 1 } } });
  return NextResponse.json({ ok: true, counted: first.ok });
}
