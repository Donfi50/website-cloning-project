import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/tokens";
import { POLICIES, clientIp, guard } from "@/lib/ratelimit";

export async function GET(req: Request) {
  const limited = await guard(POLICIES.verify, clientIp(req));
  if (limited) return limited;
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const ok = token.length === 64 && (await verifyToken(token));
  return NextResponse.redirect(new URL(`/signin?verified=${ok ? 1 : 0}`, process.env.APP_URL));
}
