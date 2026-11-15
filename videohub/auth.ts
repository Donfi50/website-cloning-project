import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { POLICIES, clientIp, limit } from "@/lib/ratelimit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(c, req) {
        const email = String(c.email ?? "").trim().toLowerCase();
        if (!(await limit(POLICIES.login, `${clientIp(req)}:${email}`)).ok) return null;
        const user = await db.user.findUnique({ where: { email } });
        if (!user || !(await bcrypt.compare(String(c.password), user.passwordHash))) return null;
        if (!user.emailVerified || user.suspendedAt) return null; // same generic failure as a wrong password
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.id = user.id; token.at = Date.now(); return token; }
      // End sessions that predate a password change (or belong to a deleted account).
      if (token.id) {
        const u = await db.user.findUnique({ where: { id: token.id as string }, select: { passwordChangedAt: true, suspendedAt: true } });
        if (!u || u.suspendedAt || (u.passwordChangedAt && u.passwordChangedAt.getTime() > (token.at as number))) return null;
      }
      return token;
    },
    session({ session, token }) { (session.user as any).id = token.id; return session; },
  },
});
