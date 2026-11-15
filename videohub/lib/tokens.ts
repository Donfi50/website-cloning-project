import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mail";

const hash = (t: string) => crypto.createHash("sha256").update(t).digest("hex");

async function issue(userId: string, type: "verify" | "reset", ttlMs: number) {
  const token = crypto.randomBytes(32).toString("hex");
  // Replace this user's previous token of the same type and sweep expired ones.
  await db.emailToken.deleteMany({ where: { OR: [{ userId, type }, { expiresAt: { lt: new Date() } }] } });
  await db.emailToken.create({
    data: { userId, type, tokenHash: hash(token), expiresAt: new Date(Date.now() + ttlMs) },
  });
  return token;
}

export async function sendVerification(user: { id: string; email: string }) {
  const token = await issue(user.id, "verify", 24 * 3600_000);
  const link = `${process.env.APP_URL}/api/verify?token=${token}`;
  await sendMail(user.email, "Verify your email", `Welcome to VideoHub!\n\nConfirm your email (valid 24 hours):\n${link}\n\nIf you didn't sign up, ignore this message.`);
}

export async function sendPasswordReset(user: { id: string; email: string }) {
  const token = await issue(user.id, "reset", 3600_000);
  const link = `${process.env.APP_URL}/reset?token=${token}`;
  await sendMail(user.email, "Reset your password", `Someone asked to reset your VideoHub password. Use this link within 1 hour:\n${link}\n\nIf this wasn't you, you can ignore this message; your password stays the same.`);
}

// Verification tokens are not deleted on use, so email-scanner prefetches can't burn them.
export async function verifyToken(token: string) {
  const rec = await db.emailToken.findUnique({ where: { tokenHash: hash(token) } });
  if (!rec || rec.type !== "verify" || rec.expiresAt < new Date()) return false;
  await db.user.update({ where: { id: rec.userId }, data: { emailVerified: new Date() } });
  return true;
}

// Reset tokens are single-use: consumed only by a POST from the reset form.
export async function resetPassword(token: string, newPassword: string) {
  const rec = await db.emailToken.findUnique({ where: { tokenHash: hash(token) } });
  if (!rec || rec.type !== "reset" || rec.expiresAt < new Date()) return false;
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.$transaction([
    db.user.update({ where: { id: rec.userId }, data: { passwordHash, passwordChangedAt: new Date() } }),
    // Following the emailed link proves ownership of the address.
    db.user.updateMany({ where: { id: rec.userId, emailVerified: null }, data: { emailVerified: new Date() } }),
    db.emailToken.deleteMany({ where: { userId: rec.userId, type: "reset" } }),
  ]);
  return true;
}
