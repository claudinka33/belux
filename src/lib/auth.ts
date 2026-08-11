import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { db, tables } from "./db";
import { eq } from "drizzle-orm";

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "E-mail in geslo",
    credentials: {
      email: { label: "E-mail", type: "email" },
      password: { label: "Geslo", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials.password) return null;
      const user = await db
        .select()
        .from(tables.users)
        .where(eq(tables.users.email, credentials.email.toLowerCase().trim()))
        .get();
      if (!user?.passwordHash) return null;
      const ok = await bcrypt.compare(credentials.password, user.passwordHash);
      if (!ok) return null;
      return {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
      };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

import { AUTH_SECRET } from "./secret";

export const authOptions: NextAuthOptions = {
  secret: AUTH_SECRET,
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/prijava" },
  callbacks: {
    async signIn({ user, account }) {
      // Ob Google prijavi ustvarimo/uporabimo lokalnega uporabnika
      if (account?.provider === "google" && user.email) {
        const email = user.email.toLowerCase();
        const existing = await db.select().from(tables.users).where(eq(tables.users.email, email)).get();
        if (!existing) {
          const [firstName, ...rest] = (user.name || "").split(" ");
          await db.insert(tables.users).values({
            email,
            firstName: firstName || "",
            lastName: rest.join(" "),
          });
        }
      }
      return true;
    },
    async jwt({ token }) {
      if (token.email) {
        const u = await db
          .select()
          .from(tables.users)
          .where(eq(tables.users.email, (token.email as string).toLowerCase()))
          .get();
        if (u) {
          token.userId = u.id;
          token.role = u.role;
          token.firstName = u.firstName;
          token.lastName = u.lastName;
          token.phone = u.phone;
        }
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).userId = token.userId;
      (session as any).role = token.role;
      (session as any).firstName = token.firstName;
      (session as any).lastName = token.lastName;
      (session as any).phone = token.phone;
      return session;
    },
  },
};
