import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/authz";
import { POLICIES, guard } from "@/lib/ratelimit";

export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const limited = await guard(POLICIES.edit, user.id);
  if (limited) return limited;

  const { uploadEmails } = await req.json();
  if (typeof uploadEmails !== "boolean") return NextResponse.json({ error: "Invalid setting" }, { status: 400 });
  await db.user.update({ where: { id: user.id }, data: { uploadEmails } });
  return NextResponse.json({ ok: true });
}
