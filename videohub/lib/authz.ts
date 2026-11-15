import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function currentUser() {
  const id = ((await auth())?.user as any)?.id as string | undefined;
  return id ? db.user.findUnique({ where: { id } }) : null;
}
export async function requireMod() {
  const u = await currentUser();
  if (!u || u.role === "USER") throw new Error("Forbidden");
  return u;
}
