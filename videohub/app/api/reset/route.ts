import { NextResponse } from "next/server";
import { resetPassword } from "@/lib/tokens";
import { POLICIES, clientIp, guard } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const limited = await guard(POLICIES.reset, clientIp(req));
  if (limited) return limited;
  const { token, password } = await req.json();
  if (typeof password !== "string" || password.length < 8)
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  if (typeof token !== "string" || token.length !== 64 || !(await resetPassword(token, password)))
    return NextResponse.json({ error: "This reset link is invalid or has expired" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
