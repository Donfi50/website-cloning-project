import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { sendVerification } from "@/lib/tokens";
import { POLICIES, clientIp, guard } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const limited = await guard(POLICIES.register, clientIp(req));
  if (limited) return limited;

  const body = await req.json();
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = body.password;
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || typeof password !== "string" || password.length < 8)
    return NextResponse.json({ error: "Name, a valid email and a password of 8+ characters are required" }, { status: 400 });
  if (await db.user.findUnique({ where: { email } }))
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });

  const user = await db.user.create({ data: { email, name, passwordHash: await bcrypt.hash(password, 12) } });
  try { await sendVerification(user); } catch (e) { console.error("verification email failed", e); }
  return NextResponse.json({ ok: true });
}
